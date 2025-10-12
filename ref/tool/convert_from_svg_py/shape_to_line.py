import os
import subprocess
import cairosvg
from PIL import Image, ImageChops, ImageOps

# def run_potrace(filepath, word, out_path):
def run_potrace():
    # os.makedirs(f'{out_path}/{word}', exist_ok=True)

    t = 0
    a = 0.3
    o = 0.2

    # potrace edges.png -s -o output.svg --turdsize 0 --alphamax 0.3 --opttolerance 0.2
    # --turdsize 0 → 작은 노이즈 제거
    # --alphamax ↓ → 더 딱딱하고 얇은 선
    # --opttolerance ↓ → 원본 모양에 더 가까움
    subprocess.run(["potrace", "output.bmp", "-s", "-o", f"word_icon_t{t}_a{a*10}_o{o*10}.svg",
                    "--turdsize", str(t), "--alphamax", str(a), "--opttolerance", str(o)])
    # print(f'potrace {filepath}, {word}, {out_path}')

def convert_png_to_bmp():
    img = Image.open("output.png")

    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])  # 알파 채널로 합성
        img = bg
    else:
        img = img.convert("RGB")

    img.save("output.bmp")

def convert_from_svg_to_png():
    cairosvg.svg2png(url='word_icon.svg', write_to='output.png', dpi=300)

def just_line():
    svg = open("word_icon.svg").read()
    svg = svg.replace('fill="black"', 'fill="none" stroke="black" stroke-width="1"')
    open("word_icon_line.svg", "w").write(svg)

def main():
    # convert_from_svg_to_png()
    # convert_png_to_bmp()
    # run_potrace()
    just_line()


# magick input.png -flatten -resize 1024x1024 -monochrome -depth 8 -colorspace Gray -type Grayscale -compress None input.ppm
# magick output.png -flatten -resize 1024x1024 -monochrome -depth 8 -colorspace Gray -type Grayscale -compress None output.ppm
# autotrace input.ppm --centerline --output-format svg --output-file output.svg
if __name__ == '__main__':
    main()
