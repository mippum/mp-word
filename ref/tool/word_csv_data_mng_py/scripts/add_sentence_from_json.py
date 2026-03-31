import uuid6
import json
from pprint import pprint


from repository.word_repository import WordRepository


word_repository = WordRepository()

def run():

    with open('../work/sentences_to_add.json', 'r', encoding='utf-8') as f:
        sentences_to_add = json.load(f)

    for sentence in sentences_to_add:
        word = sentence['word']
        en_sentence = sentence['sentence']
        ko_translation = sentence['ko_translation']
        # print(f'{word}, {en_sentence}, {ko_translation}')

        sentence_id = word_repository.read_sentences_from_word(word)

        if sentence_id is not None:
            print(f'id {sentence_id} is exist')
            continue
        #
        word_id = word_repository.read_word_id(word)
        sentence_id = str(uuid6.uuid7())
        word_repository.create_sentence(sentence_id, word_id, word, en_sentence, ko_translation)


if __name__ == '__main__':
    run()

    pass