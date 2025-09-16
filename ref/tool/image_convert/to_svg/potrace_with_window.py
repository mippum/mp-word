import subprocess

subprocess.run(["potrace", "../img/word_removed/busy.png", "-s", "-o", "output.svg"])

if __name__=='__main__':
    pass

