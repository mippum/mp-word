#!/usr/bin/env python3
"""source/*.csv -> 앱이 번들로 읽는 책 JSON 생성.

정본은 source/*.csv 이므로 work/word.db 가 아니라 CSV 에서 직접 읽는다.

출력 (기본값: <repo>/assets/books/)
  books.json          — 책 목록 + 단어별 지면 텍스트 (SVG 제외)
  icons/<slug>.json   — 그 권의 word_id -> 단어 아이콘 SVG
  icons/index.js      — slug -> require(...) 정적 맵 (Metro 는 동적 require 를 못 쓴다)

아이콘 전체는 12MB 가 넘어서 한 파일로 두면 앱이 통째로 파싱하게 된다.
권별로 쪼개 두면 열람 중인 책 것만 읽는다. --no-icons 로 생략할 수 있다.

책 한 권 = word_by_books 의 book_name 하나, word_order 가 지면 순서다.

사용법:
  python export_book_json.py [출력경로] [--no-icons]
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# SVG 가 한 셀에 통째로 들어 있어 기본 제한(128KB)을 넘는 경우가 있다
csv.field_size_limit(10 ** 7)

BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = BASE_DIR / '..' / 'source'
REPO_ROOT = BASE_DIR / '..' / '..' / '..' / '..'
DEFAULT_OUT_DIR = REPO_ROOT / 'assets' / 'books'

# 레벨 순서는 데이터로 정한다 (권별 평균 mpfpm 내림차순 = 쉬운 단어부터).
# 여기에 없는 레벨이 나오면 맨 뒤로 보낸다.
ORDER_SPELL = [
    'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth',
    'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth',
    'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth',
]


def read_csv(name):
    with open(SOURCE_DIR / name, mode='r', newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def index_by_word_id(rows, pick=None):
    """word_id -> 행 (같은 word_id 가 여러 개면 첫 행). pick 으로 걸러낸다."""
    out = {}
    for row in rows:
        if pick and not pick(row):
            continue
        out.setdefault(row['word_id'], row)
    return out


def slugify(book_name):
    return re.sub(r'[^a-z0-9]+', '-', book_name.lower()).strip('-')


def split_book_name(book_name):
    """'Foundation Basic First' -> ('Foundation', 'Basic', 1). 서수가 없으면 권차 1."""
    parts = book_name.split()
    series = parts[0] if parts else ''
    if len(parts) >= 3 and parts[-1] in ORDER_SPELL:
        return series, ' '.join(parts[1:-1]), ORDER_SPELL.index(parts[-1]) + 1
    return series, ' '.join(parts[1:]), 1


def spelling_of(word):
    """'drop' -> 'D. R. O. P.' — SSML say-as 대신 지면·낭독 모두 이 문자열을 쓴다."""
    return ' '.join(f'{ch.upper()}.' for ch in word if not ch.isspace())


def minify_svg(svg):
    """potrace/Illustrator 산출물의 선언·주석·개행을 걷어낸다 (path 데이터는 그대로)."""
    svg = re.sub(r'<\?xml.*?\?>', '', svg, flags=re.S)
    svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    svg = re.sub(r'<!DOCTYPE.*?>', '', svg, flags=re.S)
    svg = re.sub(r'<metadata>.*?</metadata>', '', svg, flags=re.S)
    svg = re.sub(r'\s*\n\s*', ' ', svg)
    return re.sub(r'\s{2,}', ' ', svg).strip()


def run(out_dir=DEFAULT_OUT_DIR, with_icons=True):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    by_books = read_csv('word_by_books.csv')
    sentences = index_by_word_id(read_csv('sentences.csv'))
    ko_defs = index_by_word_id(read_csv('simple_definitions.csv'), lambda r: r['language'] == 'ko')
    en_meanings = index_by_word_id(read_csv('en_long_meanings.csv'))
    svgs = index_by_word_id(read_csv('word_svgs.csv'))
    prons_us = index_by_word_id(read_csv('pronunciations.csv'), lambda r: r['language'] == 'us')
    prons_gb = index_by_word_id(read_csv('pronunciations.csv'), lambda r: r['language'] == 'gb')
    mpfpm = index_by_word_id(read_csv('word_mpfpm.csv'))

    grouped = defaultdict(list)
    for row in by_books:
        grouped[row['book_name']].append(row)

    missing = defaultdict(list)
    icons_by_book = {}
    books = []

    for book_name, rows in grouped.items():
        rows.sort(key=lambda r: int(r['word_order']))
        series, level, volume = split_book_name(book_name)
        slug = slugify(book_name)
        icons = {}
        words = []
        freq_sum, freq_count = 0.0, 0

        for row in rows:
            word_id, word = row['word_id'], row['word']
            sentence = sentences.get(word_id)
            ko_def = ko_defs.get(word_id)
            en_meaning = en_meanings.get(word_id)

            for label, value in (('sentence', sentence), ('ko_def', ko_def), ('en_meaning', en_meaning)):
                if value is None:
                    missing[label].append(f'{book_name}/{row["word_order"]} {word}')

            svg = svgs.get(word_id)
            if svg is None:
                missing['svg'].append(f'{book_name}/{row["word_order"]} {word}')
            else:
                icons[word_id] = minify_svg(svg['svg'])

            freq = mpfpm.get(word_id)
            if freq:
                try:
                    freq_sum += float(freq['mpfpm'])
                    freq_count += 1
                except ValueError:
                    pass

            words.append({
                'order': int(row['word_order']),
                'wordId': word_id,
                'word': word,
                'spelling': spelling_of(word),
                'pronunciationUs': (prons_us.get(word_id) or {}).get('pronunciation', ''),
                'pronunciationGb': (prons_gb.get(word_id) or {}).get('pronunciation', ''),
                'sentence': (sentence or {}).get('sentence', ''),
                'sentenceKo': (sentence or {}).get('ko_translation', ''),
                'sentenceKoReadAloud': (sentence or {}).get('ko_read_aloud', '')
                                       or (sentence or {}).get('ko_translation', ''),
                'meaningEn': (en_meaning or {}).get('meaning', ''),
                'meaningKo': (ko_def or {}).get('definition', ''),
                'meaningKoReadAloud': (ko_def or {}).get('read_aloud', '')
                                       or (ko_def or {}).get('definition', ''),
                'hasIcon': svg is not None,
            })

        icons_by_book[slug] = icons
        books.append({
            'slug': slug,
            'name': book_name,
            'series': series,
            'level': level,
            'volume': volume,
            'wordCount': len(words),
            'avgMpfpm': round(freq_sum / freq_count, 3) if freq_count else 0.0,
            'words': words,
        })

    # 레벨 순서: 권별 평균 빈도가 높은(= 쉬운) 레벨부터
    level_freq = defaultdict(list)
    for book in books:
        level_freq[book['level']].append(book['avgMpfpm'])
    level_order = sorted(level_freq, key=lambda lv: -sum(level_freq[lv]) / len(level_freq[lv]))
    rank = {level: i for i, level in enumerate(level_order)}
    books.sort(key=lambda b: (rank[b['level']], b['volume']))

    payload = {
        'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'levels': level_order,
        'books': books,
    }

    books_path = out_dir / 'books.json'
    with open(books_path, mode='w', encoding='utf-8', newline='\n') as f:
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))

    icons_dir = out_dir / 'icons'
    icon_bytes = 0
    if with_icons:
        icons_dir.mkdir(parents=True, exist_ok=True)
        for slug, icons in icons_by_book.items():
            path = icons_dir / f'{slug}.json'
            with open(path, mode='w', encoding='utf-8', newline='\n') as f:
                json.dump(icons, f, ensure_ascii=False, separators=(',', ':'))
            icon_bytes += path.stat().st_size
        # Metro 는 동적 require 를 지원하지 않으므로 정적 맵을 생성한다
        lines = ['// 자동 생성 — export_book_json.py 가 덮어쓴다. 직접 고치지 말 것.',
                 'module.exports = {']
        for book in books:
            lines.append(f"  '{book['slug']}': () => require('./{book['slug']}.json'),")
        lines.append('};')
        with open(icons_dir / 'index.js', mode='w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(lines) + '\n')

    print(f'books: {len(books)}, words: {sum(b["wordCount"] for b in books)}')
    print(f'levels (쉬운 순): {", ".join(level_order)}')
    print(f'books.json {books_path.stat().st_size / 1024:.0f} KB')
    if with_icons:
        print(f'icons/ {len(icons_by_book)}개 파일, 합계 {icon_bytes / 1024 / 1024:.1f} MB')
    else:
        print('icons/ 생략 (--no-icons)')
    for label, items in sorted(missing.items()):
        print(f'누락 {label}: {len(items)}건 — {", ".join(items[:5])}{" ..." if len(items) > 5 else ""}')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    run(args[0] if args else DEFAULT_OUT_DIR, with_icons='--no-icons' not in sys.argv)
