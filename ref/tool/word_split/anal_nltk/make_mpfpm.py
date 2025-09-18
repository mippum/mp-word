import re
from nltk.corpus import brown, gutenberg, reuters, webtext, movie_reviews
from collections import Counter
import nltk
from nltk.corpus import wordnet as wn


# 한번만
# nltk.download('brown')
# nltk.download('gutenberg')
# nltk.download('reuters')
# nltk.download('webtext')
# nltk.download('movie_reviews')
# nltk.download('wordnet')

# 각 코퍼스별 (필터링 된) total 갯수
# Total words in brown: 688590
# Total words in gutenberg: 1418257
# Total words in reuters: 792168
# Total words in webtext: 185321
# Total words in movie_reviews: 1040048

# 전체 코퍼스 수 : 4124384

# 1. Brown Corpus
# 뉴스, 픽션, 학술, 잡지 등 장르별로 나뉨
# 1960년대에 **브라운 대학교(Brown University)**에서 만든 영어 말뭉치(corpus)

# 2. Gutenberg Corpus
# 파일 수: 18~20개 주요 고전 문학
# 예: 셰익스피어, 멜빌, 찰스 디킨스 등

# 3. Inaugural Corpus
# 파일 수: 미국 대통령 취임 연설문 58개

# 4. Reuters Corpus
# 파일 수: 10,788 뉴스 기사

# 5. Webtext Corpus
# 파일 수: 7개 웹 기반 텍스트 (예: 온라인 글, 댓글)

# 6. Movie Reviews Corpus
# 파일 수: 2,000개 리뷰 (긍정/부정 1,000개씩)

# total 값으로만 계산했을 때 비율로 만든 가중치
# weights = {
#     'brown': 0.16695584116318946,
#     'gutenberg': 0.3438712302249257,
#     'reuters': 0.19206940963789987,
#     'webtext': 0.04493301302691505,
#     'movie_reviews': 0.2521705059470699
# }

# 튜닝한 값
weights = {
    'brown': 0.20,
    'gutenberg': 0.10,
    'reuters': 0.25,
    'webtext': 0.35,
    'movie_reviews': 0.05
}

wordnet_words = set(w.lower() for w in wn.words())
function_words = [
    # articles
    "a","an", "the",
    # prepositions
    "about", "above", "across", "after", "against", "along", "among",
    "around", "at", "before", "behind", "below", "beneath", "beside",
    "between", "beyond", "by", "concerning", "despite", "down", "during",
    "except", "for", "from", "in", "inside", "into", "like", "near",
    "of", "off", "on", "onto", "out", "outside", "over", "past",
    "regarding", "since", "through", "throughout", "to", "toward",
    "under", "underneath", "until", "up", "upon", "with", "within",
    "without",
    # conjunctions
    "and", "but", "or", "nor", "for", "yet", "so", "although", "because",
    "since", "unless", "while", "whereas", "if", "though", "even", "as"
]
def filer_word(word):

    # 첫 글자가 영어가 아닌 경우
    if not re.match(r'^[a-zA-Z]', word):
        return False

    if word in wordnet_words:
        return True

    if word in function_words:
        return True

    return False

corpora = {
    'brown': brown.words(),
    'gutenberg': gutenberg.words(),
    'reuters': reuters.words(),
    'webtext': webtext.words(),
    'movie_reviews': movie_reviews.words()
}

corpus_fpm = {}
for name, words in corpora.items():
    words = [w.lower() for w in words if filer_word(w)]  # 소문자로 통일
    counts = Counter(words)
    total_words = sum(counts.values())
    fpm = {word: freq / total_words * 1_000_000 for word, freq in counts.items()}
    corpus_fpm[name] = fpm
    print(f"Total words in {name}: {total_words}")

def compute_mpfpm_weighted(word):
    afpm = 0
    for name, fpm_dict in corpus_fpm.items():
        weight = weights.get(name, 0)
        afpm += fpm_dict.get(word, 0) * weight
    return afpm

# --- 6. 테스트 단어 ---
words_to_check = ['the', 'and', 'of', 'hello', 'blog']

# --- 7. 결과 출력 ---
for word in words_to_check:
    print(f"MPFPM (weighted) of '{word}': {compute_mpfpm_weighted(word)}")
# MPFPM (weighted) of 'the': 62964.682939381426
# MPFPM (weighted) of 'and': 30990.174310463215
# MPFPM (weighted) of 'of': 34342.04658483433
# MPFPM (weighted) of 'hello': 7.260311399156724
# MPFPM (weighted) of 'blog': 9.443074449198958

all_words = set()
for fpm_dict in corpus_fpm.values():
    all_words.update(fpm_dict.keys())

import csv
with open('word_mpfpm.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['word', 'mpfpm'])
    for word in sorted(all_words):
        mpfpm = compute_mpfpm_weighted(word)
        writer.writerow([word, mpfpm])

# with open('filter_for_element.json', 'w', encoding='utf-8') as f:
#     f.write(json.dumps(element, ensure_ascii=False))

