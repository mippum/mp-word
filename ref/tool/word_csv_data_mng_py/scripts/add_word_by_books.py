#!/usr/bin/env python3
import os
from pathlib import Path
import csv
import uuid6

from repository.word_repository import WordRepository

BOOK_PRE_NAME = 'Foundation Introductory'

word_repository = WordRepository()

def run():
    csv_path = Path(os.path.join('..', 'work', 'word_base.csv'))

    word_base_rows = []
    with open(csv_path, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)
        for row in reader:
            word_base_rows.append(row)

    for csv_word_number, word in word_base_rows:
        book_number, word_order = csv_word_number.split('_')

        with open(os.path.join('..', 'source', 'word_by_books.csv'), mode='a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            word_id = word_repository.read_word_id(word)
            writer.writerow([str(uuid6.uuid7()), word_id, word, f'{BOOK_PRE_NAME}', word_order])
            # writer.writerow([str(uuid6.uuid7()), word_id, word, f'{BOOK_PRE_NAME} {order_spell[int(book_number)-1]}', word_order])

order_spell = [
    'First',
    'Second',
    'Third',
    'Fourth',
    'Fifth',
    'Sixth',
    'Seventh',
    'Eighth',
    'Ninth',
    'Tenth',
    'Eleventh',
    'Twelfth',
    'Thirteenth',
    'Fourteenth',
    'Fifteenth',
    'Sixteenth',
    'Seventeenth',
    'Eighteenth',
    'Nineteenth',
]


if __name__ == "__main__":
    run()

