import os

def remove_already_words():
    with open("already.txt", 'r') as f:
        already_list = [line.rstrip('\n') for line in f.readlines()]

    with open("need.txt", 'r') as f:
        needs = [ line.rstrip('\n') for line in f.readlines()]

    needs = [need for need in needs if need not in already_list]

    with open("need.txt", 'w') as f:
        f.write('\n'.join(needs))

def make_already_words():
    path = r'C:\Users\sojun\github\mp-word\assets\images\words'
    items = os.listdir(path)
    asset_words = [name for name in items if os.path.isdir(os.path.join(path, name))]
    print(asset_words)
    with open("already.txt", 'w') as f:
        f.write('\n'.join(asset_words))

def print_gpt_prompts():

    with open("need.txt", 'r') as f:
        needs = [ line.rstrip('\n') for line in f.readlines()[:6*100]]

    need_chunks = [needs[i:i + 6] for i in range(0, len(needs), 6)]
    for need_chunk in need_chunks:
        print('Create a single image divided into six equal-sized sections, ensuring each section has the same width and height, and illustrate one of the following words in minimalist line art:')
        for i in range(len(need_chunk)):
            print(f'{i+1}. {need_chunk[i]}')
        print('\n')


# 스크립트를 실행하려면 여백의 녹색 버튼을 누릅니다.
if __name__ == '__main__':
    # remove_already_words()
    # make_already_words()
    print_gpt_prompts()
    pass
