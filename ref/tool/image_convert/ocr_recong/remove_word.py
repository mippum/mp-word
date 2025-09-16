import math
import os

import cv2
import numpy as np
import pytesseract


# 글자 박스 계산
def decode_predictions(scores, geometry, confThreshold=0.5):
    (numRows, numCols) = scores.shape[2:4]
    boxes = []
    confidences = []

    for y in range(numRows):
        scoresData = scores[0,0,y]
        x0_data = geometry[0,0,y]
        x1_data = geometry[0,1,y]
        x2_data = geometry[0,2,y]
        x3_data = geometry[0,3,y]
        anglesData = geometry[0,4,y]

        for x in range(numCols):
            if scoresData[x] < confThreshold:
                continue
            offsetX, offsetY = x*4.0, y*4.0
            angle = anglesData[x]
            cos = np.cos(angle)
            sin = np.sin(angle)
            h = x0_data[x] + x2_data[x]
            w = x1_data[x] + x3_data[x]
            endX = int(offsetX + (cos * x1_data[x]) + (sin * x2_data[x]))
            endY = int(offsetY - (sin * x1_data[x]) + (cos * x2_data[x]))
            startX = int(endX - w)
            startY = int(endY - h)
            boxes.append((startX, startY, endX, endY))
            confidences.append(float(scoresData[x]))
    return boxes, confidences

def run(image, out_path):
    # Tesseract 경로 지정 (Windows)
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    # EAST 모델 로드
    net = cv2.dnn.readNet(r"C:\Users\wogud\frozen_east_text_detection.pb")  # 미리 다운로드 필요
    # 입력 이미지 블롭 생성
    newW, newH = (320, 320)

    padding_bottom = 5

    orig = image.copy()
    (H, W) = image.shape[:2]

    rW = W / float(newW)
    rH = H / float(newH)
    blob = cv2.dnn.blobFromImage(image, 1.0, (newW, newH),
                                 (123.68, 116.78, 103.94), swapRB=True, crop=False)
    net.setInput(blob)

    # 출력 레이어
    scores, geometry = net.forward(["feature_fusion/Conv_7/Sigmoid", "feature_fusion/concat_3"])
    boxes, confidences = decode_predictions(scores, geometry)
    indices = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

    # 글자 영역 지우기
    text = ''
    for i in indices:
        i = i[0] if isinstance(i, (list, tuple, np.ndarray)) else i
        (startX, startY, endX, endY) = boxes[i]
        # 원본 비율로 좌표 조정
        startX = math.floor(startX * rW)
        startY = math.floor(startY * rH)
        endX = math.ceil(endX * rW)
        endY = math.ceil(endY * rH) + padding_bottom

        roi = orig[startY:endY, startX:endX]
        custom_config = r'--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        text += pytesseract.image_to_string(roi, config=custom_config).strip()

        # 영역을 흰색으로 지우기 (혹은 주변 배경으로 inpaint 가능)
        cv2.rectangle(orig, (startX, startY), (endX, endY), (255,255,255), -1)

    # 결과 저장
    if not os.path.exists(out_path):
        os.makedirs(out_path, exist_ok=True)

    cv2.imwrite(f"{out_path}/{text}.png", orig)

    print(f"{out_path}/{text}.png 저장")

if __name__ == "__main__":
    image_loaded = cv2.imread("C:/Users/sojun/github/mp-word/ref/tool/image_convert/img/divide/crop_0.png")
    run(image_loaded, '../img/word_removed')

    # cv2.imshow("Original", orig)
    # cv2.waitKey(0)
    print("글자 영역 제거 완료!")
