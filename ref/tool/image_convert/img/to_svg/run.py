import cv2
import numpy as np


def raster_to_svg(image_path, svg_path):
    # 흑백으로 로드
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # 이진화 (윤곽 감지를 위해)
    _, thresh = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY)

    # 윤곽선 추출
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # SVG 작성
    with open(svg_path, "w") as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" version="1.1">\n')
        for contour in contours:
            path_data = "M " + " L ".join(f"{x},{y}" for x, y in contour[:, 0])
            f.write(f'<path d="{path_data} Z" stroke="black" fill="none"/>\n')
        f.write('</svg>')


if __name__ == '__main__':
    pass
    # raster_to_svg("input.png", "output.svg")
    # raster_to_svg("../img/word_removed/busy.png", "output.svg")
    raster_to_svg(r"C:\Users\sojun\github\mp-word\ref\tool\image_convert\img\word_removed\busy.png", "output.svg")
