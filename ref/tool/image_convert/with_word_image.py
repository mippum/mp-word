import os
import shutil

import cv2
from PIL import Image

from divide.run import divide_img
from ocr_recong import remove_word
from remove_white_background.run import remove_background
from to_svg.potrace_with_command import run_potrace
from word_named.run import set_image_named

def to_word_removed(origin_filename):
    img = cv2.imread(f'img/origin/{origin_filename}')
    divide_img(img, 'img/divide')

    if os.path.exists('img/word_named'):
        shutil.rmtree('img/word_named')
    os.makedirs('img/word_named', exist_ok=True)
    for filename in os.listdir('img/divide'):
        file_path = os.path.join('img/divide', filename)
        divided_img = cv2.imread(file_path)
        set_image_named(divided_img, 'img/word_named')
    #
    if os.path.exists('img/word_removed'):
        shutil.rmtree('img/word_removed')
    os.makedirs('img/word_removed', exist_ok=True)
    for filename in os.listdir('img/word_named'):
        file_path = os.path.join('img/word_named', filename)
        divided_img = cv2.imread(file_path)
        remove_word.run(divided_img, filename.replace('.png', ''), 'img/word_removed')

def after_word_removed():
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

def run(origin_filename):
    print(f'with_word_image convert {origin_filename}')

    to_word_removed(origin_filename)
    after_word_removed()
    # img/word_removed 에서 ocr 에러 있는지 확인하고, 있으면 그림 수정 후 after_word_removed 만 다시 실행

if __name__ == '__main__':
    run('xEpxLHFxI12xYNJU.png')
