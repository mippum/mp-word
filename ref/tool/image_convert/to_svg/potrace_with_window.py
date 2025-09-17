import subprocess

def convert(filename, out_path):

    subprocess.run(["potrace", "filename", "-s", "-o", "output.svg"])
    pass

if __name__=='__main__':
    convert("../img/word_removed/busy.bmp", '../img/to_svg')
    # subprocess.run(["potrace", "../img/word_removed/busy.bmp", "-s", "-o", "output.svg"])

