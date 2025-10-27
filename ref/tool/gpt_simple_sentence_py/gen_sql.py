import json
import re

import pyperclip

def make_sql(json_file_name):
    sql_str = ''
    with open(json_file_name, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines()]

    for line in lines:
        if not ':' in line:
            continue
        word = line.split(':')[0]
        word = word.lower()
        sentence = line[len(word)+2:]
        if '(' in word:
            word = re.sub(r'\(.*?\)', '', word)
            word = word.strip()
        if '(' in sentence:
            sentence = re.sub(r'\(.*?\)', '', sentence)
            sentence = sentence.strip()
            # print(f'{word}: {sentence}')

        word = word.replace("'", "''")
        sentence = sentence.replace("'", "''")
        sql = f"INSERT IGNORE INTO sentences(id, word, sentence) value (uuid_v7(), '{word}', '{sentence}');"
        sql_str += sql + '\n'
    # for gen in gens:
    #     gen['meaning'] = gen['meaning'].replace("'", "''")
    #     sql = f"INSERT IGNORE INTO en_long_meanings(id, word, meaning) value (uuid_v7(), '{gen['word']}', '{gen['meaning']}');"
    #     print(sql)
    #     sql_str += sql + '\n'
    return sql_str

def run():
    sql_str = ''

    t_str = make_sql(f'gpt_gen/02.txt')
    sql_str += t_str

    with open('create.sql', 'w', encoding='utf-8') as f:
        f.write(sql_str)

    print(sql_str)

    pyperclip.copy(sql_str)

if __name__ == '__main__':
    run()

