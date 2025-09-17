import shutil

import cv2
import numpy as np
import os

def divide_img(img, output_path):
    # 원본 이미지 읽기
    # img = cv2.imread("C:/Users/sojun/github/mp-word/ref/tool/image_convert/img/origin/0uA-.png")
    # img = cv2.imread("img/origin/0uA-.png")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 이진화 (분리선을 강조하기 위해 threshold 적용)
    _, thresh = cv2.threshold(gray, 230, 255, cv2.THRESH_BINARY_INV)

    # 모폴로지 연산으로 가로/세로 선 추출
    # 세로 선 검출
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 30))
    vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

    # 가로 선 검출
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 1))
    horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)

    # 선 합치기
    lines = cv2.add(vertical_lines, horizontal_lines)

    # 선의 윤곽 찾기
    contours, _ = cv2.findContours(~lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 잘라낸 이미지 저장 폴더
    if os.path.exists(output_path):
        shutil.rmtree(output_path)
    os.makedirs(output_path, exist_ok=True)

    i = 0
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # 너무 작은 영역은 무시 (노이즈 제거)
        if w > 20 and h > 20:
            crop = img[y:y+h, x:x+w]
            cv2.imwrite(f"{output_path}/crop_{i}.png", crop)
            i += 1

    print(f"{output_path}에 {i}개의 이미지가 저장되었습니다.")

if __name__ == "__main__":
    img = cv2.imread("C:/Users/sojun/github/mp-word/ref/tool/image_convert/img/origin/0uA-.png")
    divide_img(img, "../img/divide")
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    pass
