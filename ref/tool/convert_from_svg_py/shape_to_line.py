import os
import shutil
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

def change_line_width():
    svg = open("word_icon.svg").read()
    # svg = svg.replace('fill="black"', 'fill="none" stroke="black" stroke-width="1"')
    svg = svg.replace('stroke:#000000; fill:none;', 'stroke:#000000; stroke-width:3.0; fill:none;')
    open("output.svg", "w").write(svg)

def convert_from_png_to_ppm():
    subprocess.run(['magick', 'output.png', '-flatten', '-resize', '1024x1024', '-monochrome', '-depth', '8',
                    '-colorspace', 'Gray', '-type', 'Grayscale', '-compress', 'None', 'output.ppm'])

def convert_from_ppm_to_line_svg():
    subprocess.run(['autotrace', 'output.ppm', '--centerline', '--output-format', 'svg', '--output-file', 'output.svg'])

path = '/Users/kei/github/mp-word/assets/images/words'

def copy_from_assets(word):
    '/github/mp-word/'
    shutil.copy(path + '/_' + word + '/word_icon.svg', 'word_icon.svg')

def copy_to_assets(word):
    shutil.copy('output.svg', path + '/' + word + '/word_icon.svg')
def main():

    words = [f for f in os.listdir(path) if os.path.isdir(os.path.join(path, f))]
    # words = ['she', 'he']
    # words = ['a']

    # for word in words:
    #     print(word)
    #     copy_from_assets(word)
    #     convert_from_svg_to_png()
        copy_from_assets(word)
        convert_from_svg_to_png()
        shutil.copy('output.png', f'work/{word}.png')

    #     convert_from_png_to_ppm()
    #     convert_from_ppm_to_line_svg()
    #     copy_to_assets(word)

    # for word in words:
    #     print(word)
    #     copy_from_assets(word)
    #     change_line_width()
    #     copy_to_assets(word)

    pass


if __name__ == '__main__':
    main()
