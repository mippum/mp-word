from more_itertools import chunked

def run():

    with open('origin_words.txt', 'r', encoding='utf-8') as f:
        origin_words = [line.strip() for line in f.readlines()]

    words_chunks =chunked(origin_words, 50)

    for words_chunk in words_chunks:
        print('이 단어들도 해줘.')
        for word in words_chunk:
            print(word)
        print('\n')

if __name__ == '__main__':
    run()


