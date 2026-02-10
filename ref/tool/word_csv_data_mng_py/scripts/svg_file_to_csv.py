import os
import csv
import uuid6

greenydot_word_path = r'C:\Users\USER\github\greenydot_flight_api\flight-app\public\static\mp-word\words'

def copy_from_greenydot():
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
            with open(svg_file_path, mode='r', encoding='utf-8') as f:
                svg_file = f.read()
        except:
            # print(f'no svg: {svg_file_path}')
            continue

        with open(r'..\source\word_svgs.csv', mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([str(uuid6.uuid7()), word_id, word, 'repr', svg_file])



def run():
    copy_from_greenydot()

if __name__ == '__main__':
    run()

