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

def run():
    print()


# 스크립트를 실행하려면 여백의 녹색 버튼을 누릅니다.
if __name__ == '__main__':
    remove_already_words()
    # make_already_words()
    # run()
    pass
