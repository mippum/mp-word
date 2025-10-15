from more_itertools import chunked

def run():

    with open("needs.txt", 'r') as f:
        needs = [ line.rstrip('\n') for line in f.readlines()]

    need_chunks = [needs[i:i + 6] for i in range(0, len(needs), 6)]
    need_chunks = need_chunks[100*1:100*2]
    for need_chunk in need_chunks:
        print('Create a single image divided into six equal-sized sections, ensuring each section has the same width and height, and illustrate one of the following words in minimalist line art:')
        for i in range(len(need_chunk)):
            print(f'{i+1}. {need_chunk[i]}')
        print('\n')


if __name__ == '__main__':
    run()


