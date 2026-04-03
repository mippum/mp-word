import os
import shutil
from pathlib import Path
import sqlite3
import pandas as pd
import csv
import uuid6

from repository.word_repository import WordRepository

asset_path = r'C:\Users\wogud\github\mp-word\assets\images\words'

# greenydot_word_path = r'C:\Users\USER\github\greenydot_flight_api\flight-app\public\static\mp-word\words'
greenydot_word_path = r'C:\Users\wogud\github\greenydot_flight_api\flight-app\public\static\mp-word\words'

word_repository = WordRepository()

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


def add_to_csv_from_greenydot():
    word_ids = [
        name for name in os.listdir(greenydot_word_path)
        if os.path.isdir(os.path.join(greenydot_word_path, name))
    ]

    # word_ids = word_ids[:2] # fixme

    with open(r'..\source\word_svgs.csv', mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'word_id', 'word', 'mode', 'svg'])

    for word_id in word_ids:
        words = [
            name.replace('_', '') for name in os.listdir(f'{greenydot_word_path}/{word_id}')
        ]
        word = words[0]
        try:
            svg_file_path = f'{greenydot_word_path}\\{word_id}\\_{word}\\word_icon.svg'
            if not os.path.exists(svg_file_path):
                svg_file_path = f'{greenydot_word_path}\\{word_id}\\_{word}\\word_shape_icon.svg'
            with open(svg_file_path, mode='r', encoding='utf-8') as f:
                svg_file = f.read()
        except:
            # print(f'no svg: {svg_file_path}')
            continue

        with open(r'..\source\word_svgs.csv', mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([str(uuid6.uuid7()), word_id, word, 'repr', svg_file])

def copy_to_asset_from_greenydot():
    word_ids = [
        name for name in os.listdir(greenydot_word_path)
        if os.path.isdir(os.path.join(greenydot_word_path, name))
    ]

    # word_ids = word_ids[:2] # fixme

    with open(r'..\source\word_svgs.csv', mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'word_id', 'word', 'mode', 'svg'])

    for word_id in word_ids:
        words = [
            name.replace('_', '') for name in os.listdir(f'{greenydot_word_path}/{word_id}')
        ]
        word = words[0]
        svg_file_path = f'{greenydot_word_path}\\{word_id}\\_{word}\\word_shape_icon.svg'
        target_file_path = os.path.join(asset_path, '_' + word, 'word_icon.svg')
        if not os.path.exists(svg_file_path):
            print(f'no svg: {svg_file_path}')
            continue
        shutil.copyfile(svg_file_path, target_file_path)


def add_asset_to_csv(word):
    word_id = word_repository.read_word_id(word)
    svg_file_path = os.path.join(asset_path, '_' + word, 'word_icon.svg')

    with open(svg_file_path, mode='r', encoding='utf-8') as f:
        svg_file = f.read()

    with open(r'..\source\word_svgs.csv', mode='a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([str(uuid6.uuid7()), word_id, word, 'repr', svg_file])

def modify_asset_to_sqlitedb():
    for word_folder_name in os.listdir(asset_path):
        word = word_folder_name[1:]
        # print(word)
        svg_id = word_repository.read_repr_svg_id_by_word(word)
        if svg_id is None:
            print(f'{word}')
            continue
            # word_id = word_repository.read_word_id(word)
            # if word_id is None:
            #     print(f'{word}')
            #     continue

            # svg_id = str(uuid6.uuid7())
            # svg_file_path = os.path.join(asset_path, '_' + word, 'word_icon.svg')
            # with open(svg_file_path, mode='r', encoding='utf-8') as f:
            #     svg = f.read()
            # word_repository.create_svg(svg_id, word_id, word, svg)

        svg_file_path = os.path.join(asset_path, '_' + word, 'word_icon.svg')
        with open(svg_file_path, mode='r', encoding='utf-8') as f:
            svg = f.read()

        db_svg = word_repository.read_word_svg_by_id(svg_id)
        if svg != db_svg:
            word_repository.update_svg(svg_id, svg)
        pass

def run():
    pass
    # copy_sqlitedb_to_asset()
    # add_asset_to_csv('rest')
    # add_asset_to_csv('sidebar')
    # copy_to_asset_from_greenydot()
    modify_asset_to_sqlitedb()

if __name__ == '__main__':
    run()
