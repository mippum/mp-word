import os
import shutil

import cv2
from PIL import Image

from divide.run import divide_img
from ocr_recong import remove_word
from remove_white_background.run import remove_background
from to_svg.potrace_with_command import run_potrace

def run(origin_filename):
    print(f'with_word_image convert {origin_filename}')
    img = cv2.imread(f'img/origin/{origin_filename}')

    divide_img(img, 'img/divide')

    if os.path.exists('img/word_removed'):
        shutil.rmtree('img/word_removed')
    os.makedirs('img/divide', exist_ok=True)
    for filename in os.listdir('img/divide'):
        file_path = os.path.join('img/divide', filename)
        divided_img = cv2.imread(file_path)
        remove_word.run(divided_img, 'img/word_removed')

    if os.path.exists('img/remove_white_background'):
        shutil.rmtree('img/remove_white_background')
    os.makedirs('img/remove_white_background', exist_ok=True)
    for filename in os.listdir('img/word_removed'):
        file_path = os.path.join('img/word_removed', filename)
        word_removed_img = Image.open(file_path)
        remove_background(word_removed_img, filename.replace('.png', ''), 'img/remove_white_background')

    if os.path.exists('img/to_svg'):
        shutil.rmtree('img/to_svg')
    os.makedirs('img/to_svg', exist_ok=True)
    for filename in os.listdir('img/remove_white_background'):
        file_path = os.path.join('img/remove_white_background', filename)
        run_potrace(file_path, filename.replace('.bmp', ''), 'img/to_svg')

if __name__ == '__main__':
    run('0uA-.png')
