import json
import pyperclip

def make_sql(json_file_name):
    sql_str = ''
    with open(json_file_name, 'r', encoding='utf-8') as f:
        gens = json.load(f)
    for gen in gens:
        gen['meaning'] = gen['meaning'].replace("'", "''")
        sql = f"INSERT IGNORE INTO en_long_meanings(id, word, meaning) value (uuid_v7(), '{gen['word']}', '{gen['meaning']}');"
        print(sql)
        sql_str += sql + '\n'
    return sql_str

def run():
    sql_str = ''

    for i in range(1, 20+1):
        t_str = make_sql(f'gpt_gen/{str(i).zfill(2)}.json')
        sql_str += t_str

    with open('create.sql', 'w', encoding='utf-8') as f:
        f.write(sql_str)
    pyperclip.copy(sql_str)

if __name__ == '__main__':
    run()

