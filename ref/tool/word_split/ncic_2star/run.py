import json

from more_itertools import chunked


with open("words.json", "r", encoding="utf-8") as f:
    words = json.load(f)

for word_chucked in chunked(words, 6):
# for word_chucked in range(0, len(words), 6):
    print("Create a single image divided into six equal-sized sections, "
          "ensuring each section has the same width and height, "
          "and illustrate one of the following words in minimalist line art:")
    for index, word in enumerate(word_chucked):
        print(f"{index+1}. {word}")
    print("\n")
