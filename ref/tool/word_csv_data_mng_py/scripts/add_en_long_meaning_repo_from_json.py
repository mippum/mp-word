import uuid6
import json
from pprint import pprint


from repository.word_repository import WordRepository


word_repository = WordRepository()

def run():

    with open('../work/en_long_meanings_to_add.json', 'r') as f:
        en_long_meanings_to_add = json.load(f)

    for en_long_meaning in en_long_meanings_to_add:
        word = en_long_meaning['word']
        meaning = en_long_meaning['meaning']
        en_long_meaning_id = word_repository.read_en_long_meaning_id_from_word(word)
        if en_long_meaning_id is not None:
            print(f'id {en_long_meaning_id} is exist')
            continue

        word_id = word_repository.read_word_id(word)
        en_long_meaning_id = str(uuid6.uuid7())
        word_repository.create_en_long_meaning(en_long_meaning_id, word_id, word, meaning)


if __name__ == '__main__':
    run()

    pass