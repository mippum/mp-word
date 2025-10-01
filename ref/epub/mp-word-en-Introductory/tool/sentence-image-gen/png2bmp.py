import os
from PIL import Image

png_folder = "png-images"
bmp_folder = "bmp-images"

for filename in os.listdir(png_folder):
    if filename.lower().endswith(".png"):
        jpg_path = os.path.join(png_folder, filename)
        bmp_path = os.path.join(bmp_folder, os.path.splitext(filename)[0] + ".bmp")

        with Image.open(jpg_path) as img:
            img.save(bmp_path, "BMP")

# filename = 'Do you want tea or coffee_.jpg'
# jpg_path = os.path.join(jpg_folder, filename)
# bmp_path = os.path.join(bmp_folder, os.path.splitext(filename)[0] + ".bmp")
#
# with Image.open(jpg_path) as img:
#     img.save(bmp_path, "BMP")

print("변환 완료!")
