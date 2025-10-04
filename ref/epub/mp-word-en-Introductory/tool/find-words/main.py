
def remove_already_words():
    with open("already.txt", 'r') as f:
        already_list = [line for line in f.readlines()]

    with open("need.txt", 'r') as f:
        needs = [ line for line in f.readlines()]

    needs = [need for need in needs if need not in already_list]

    with open("need.txt", 'w') as f:
        for need in needs:
            f.write(need)

def run():
    print()


# 스크립트를 실행하려면 여백의 녹색 버튼을 누릅니다.
if __name__ == '__main__':
    remove_already_words()
    # run()
    pass
