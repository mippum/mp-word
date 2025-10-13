import json
import pyperclip


def make_sql(json_file_name):
    sql_str = ''
    with open(json_file_name, 'r', encoding='utf-8') as f:
        gens = json.load(f)
    for gen in gens:
        word = gen['word'].replace("'", "''")
        us_prounce = gen['pronunciations']['us'].replace("'", "''")
        sql = f"INSERT IGNORE INTO pronunciations(id, word, language, pronunciation) value (uuid_v7(), '{word}', 'us', '{us_prounce}');"
        print(sql)
        sql_str += sql + ('\n'
                          '')
        gb_pronunce = gen['pronunciations']['gb'].replace("'", "''")
        sql = f"INSERT IGNORE INTO pronunciations(id, word, language, pronunciation) value (uuid_v7(), '{word}', 'gb', '{gb_pronunce}');"
        print(sql)
        sql_str += sql + '\n'

        sql = f"INSERT IGNORE INTO simple_definitions(id, word, language, definition) value (uuid_v7(), '{word}', 'ko', '{gen['ko-repr'].replace("'", "''")}' );"
        print(sql)
        sql_str += sql + '\n'

    return sql_str

def run():
    sql_str = ''

    for i in range(1, 20+1):
        print(i)
        t_str = make_sql(f'gpt_gen/{str(i).zfill(2)}.json')
        sql_str += t_str

    with open('create.sql', 'w', encoding='utf-8') as f:
        f.write(sql_str)

    pyperclip.copy(sql_str)

if __name__ == '__main__':
    run()

