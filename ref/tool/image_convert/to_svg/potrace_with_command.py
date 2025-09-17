import os
import subprocess

def run_potrace(filepath, word, out_path):
    os.makedirs(f'{out_path}/{word}', exist_ok=True)
    subprocess.run(["potrace", filepath, "-s", "-o", f"{out_path}/{word}/word_icon.svg"])
    print(f'potrace {filepath}, {word}, {out_path}')

if __name__=='__main__':
    run_potrace("../img/remove_white_background/busy.bmp", 'busy', '../img/to_svg')
    # subprocess.run(["potrace", "../img/word_removed/busy.bmp", "-s", "-o", "output.svg"])

