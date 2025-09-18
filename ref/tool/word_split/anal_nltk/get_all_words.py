import nltk
from nltk.corpus import wordnet as wn
import csv
import re

# WordNet 다운로드 (한 번만)
# nltk.download('wordnet')

# 모든 WordNet lemma 추출
all_words = set()
for synset in wn.all_synsets():
    for lemma in synset.lemmas():
        word = lemma.name()
        # 첫 글자가 영어가 아닌 경우
        if not re.match(r'^[a-zA-Z]', word):
            continue

        # 고유명사/이름 패턴 제거: 대문자로 시작하고 마침표 포함된 경우
        if re.match(r'^[A-Z].*\..*', word):
            continue

        # 공백이 있어서 복합어인 경우
        if '_' in word:
            continue

        all_words.add(word.lower())

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

# 파일로 저장 (예: CSV)
with open('wordnet_words.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    for word in sorted(all_words | set(function_words)):
        writer.writerow([word])

print(f"총 {len(all_words)}개의 단어를 저장했습니다.")
