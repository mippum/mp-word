from PIL import Image
import potrace
import numpy as np

def bitmap_to_svg(input_path, output_path):
    # 1. 이미지 흑백으로 로드
    img = Image.open(input_path).convert("L")
    # 흑백 → 0/1로 변환
    bitmap = np.array(img)
    bitmap = np.where(bitmap > 128, 0, 1).astype(np.uint8)

    # 2. potrace bitmap 객체 생성
    potrace_bitmap = potrace.Bitmap(bitmap)
    path = potrace_bitmap.trace()

    # 3. SVG 파일 작성
    with open(output_path, "w") as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" version="1.1">\n')
        for curve in path:
            for segment in curve:
                if segment.is_corner:
                    f.write(f'<path d="M {segment.start_point[0]},{segment.start_point[1]} L {segment.end_point[0]},{segment.end_point[1]}" stroke="black" fill="none"/>\n')
                else:
                    c = segment.c
                    f.write(f'<path d="M {segment.start_point[0]},{segment.start_point[1]} C {c[0][0]},{c[0][1]} {c[1][0]},{c[1][1]} {segment.end_point[0]},{segment.end_point[1]}" stroke="black" fill="none"/>\n')
        f.write('</svg>')

# 사용 예시
bitmap_to_svg("input.png", "output.svg")
