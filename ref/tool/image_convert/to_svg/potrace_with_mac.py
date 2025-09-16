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
            start = curve.start_point  # curve 시작점
            for segment in curve:
                if segment.is_corner:
                    end = segment.end_point
                    f.write(f'<path d="M {start[0]},{start[1]} L {end[0]},{end[1]}" stroke="black" fill="none"/>\n')
                    start = end
                else:
                    c1, c2 = segment.c1, segment.c2
                    end = segment.end_point
                    f.write(
                        f'<path d="M {start[0]},{start[1]} '
                        f'C {c1[0]},{c1[1]} {c2[0]},{c2[1]} {end[0]},{end[1]}" '
                        f'stroke="black" fill="none"/>\n'
                    )
                    start = end
        f.write('</svg>')


if __name__ == "__main__":
    # bitmap_to_svg("../img/word_removed/busy.png", "output.svg")
    bitmap_to_svg("/Users/kei/github/mp-word/ref/tool/image_convert/img/word_removed/busy.png", "output.svg")


# 사용 예시

