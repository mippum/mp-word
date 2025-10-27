import os
import subprocess

bmp_folder = "bmp-images"
svg_folder = "svg-images"

potrace_exe = r"C:\ProgramEtc\potrace-1.16.win64\potrace.exe"

for filename in os.listdir(bmp_folder):
    if filename.lower().endswith(".bmp"):
        bmp_path = os.path.join(bmp_folder, filename)
        svg_path = os.path.join(svg_folder, os.path.splitext(filename)[0] + ".svg")

        # potrace 실행
        subprocess.run([potrace_exe, bmp_path, "-s", "-o", svg_path], check=True)

print("모든 BMP → SVG 변환 완료!")
