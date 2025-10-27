def main():

    with open('exist.txt', 'r', encoding='utf-8') as f:
        origin_words = [line.strip().lower() for line in f]

    with open('check.txt', 'r', encoding='utf-8') as f:
        check_words = [line.strip().lower() for line in f]

    needs = []
    for check_word in check_words:
        if check_word not in origin_words:
            # print(check_word)
            needs.append(check_word)

    with open('needs.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(needs))

if __name__ == '__main__':
    main()
