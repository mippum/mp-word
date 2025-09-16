import os

import cv2

from divide.run import divide_img
from ocr_recong import remove_word

# image_count = 6

# img = cv2.imread("C:/Users/sojun/github/mp-word/ref/tool/image_convert/img/origin/0uA-.png")

if __name__ == '__main__':
    img = cv2.imread("img/origin/0uA-.png")

    # divide_img(img, 'img/divide')

    for filename in os.listdir('img/divide'):
        file_path = os.path.join('img/divide', filename)
        divided_img = cv2.imread(file_path)
        remove_word.run(divided_img, 'img/word_removed')





