import json
from more_itertools import chunked

with open("oxford_a1.json", "r", encoding="utf-8") as f:
    words = json.load(f)

word_chunked = chunked(words, 6)

for word_list in word_chunked:
    print(f'Create a single image divided into six equal-sized sections, ensuring each section has the same width and height, and illustrate one of the following words in minimalist line art:')
    print(f'1. {word_list[0]}')
    print(f'2. {word_list[1]}')
    print(f'3. {word_list[2]}')
    print(f'4. {word_list[3]}')
    print(f'5. {word_list[4]}')
    print(f'6. {word_list[5]}')
    print('\n\n')
