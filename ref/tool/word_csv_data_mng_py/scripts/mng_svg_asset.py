import os
from pathlib import Path
import sqlite3
import pandas as pd

asset_path = r'C:\Users\wogud\github\mp-word\assets\images\words'


def copy_sqlitedb_to_asset():
    db_path = Path(os.path.join('..', 'work', 'word.db'))
    table_name = 'word_svgs'

    conn = sqlite3.connect(db_path)

    query = f'SELECT * FROM "{table_name}";'
    print("Executing:", query)

    df = pd.read_sql_query(query, conn)

    for value in df.values:
        word = value[2]
        xml = value[4]

        if not os.path.exists(os.path.join(asset_path, '_' + word)):
            os.makedirs(os.path.join(asset_path, '_' + word))

        xml_filename = os.path.join(asset_path, '_' + word, 'word_icon.svg')
        with open(xml_filename, mode='w', newline='', encoding='utf-8') as f:
            f.write(xml)

    conn.close()

def run():
    copy_sqlitedb_to_asset()

if __name__ == '__main__':
    run()
