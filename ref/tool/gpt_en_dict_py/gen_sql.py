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

def update_sql(json_file_name):
    sql_str = ''
    with open(json_file_name, 'r', encoding='utf-8') as f:
        gens = json.load(f)
    for gen in gens:
        gen['meaning'] = gen['meaning'].replace("'", "''")
        sql = f"UPDATE en_long_meanings SET meaning = '{gen['meaning']}' where word = '{gen['word']}';"
        print(sql)
        sql_str += sql + '\n'
    return sql_str

def make_sqls():
    sql_str = ''

    for i in range(1, 2):
        t_str = make_sql(f'gpt_gen/{str(i).zfill(2)}.json')
        sql_str += t_str
    with open('create.sql', 'w', encoding='utf-8') as f:
        f.write(sql_str)

    pyperclip.copy(sql_str)


def update_sqls():
    sql_str = ''

    for i in range(1, 5):
        t_str = update_sql(f'gpt_gen/{str(i).zfill(2)}.json')
        sql_str += t_str
    with open('update.sql', 'w', encoding='utf-8') as f:
        f.write(sql_str)

    pyperclip.copy(sql_str)


def run():
    # make_sqls()
    update_sqls()

if __name__ == '__main__':
    run()

