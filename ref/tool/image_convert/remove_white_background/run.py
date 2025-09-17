from PIL import Image, ImageChops, ImageOps


def remove_background(image, filename, out_path):
    # img = Image.open("../img/divide/busy.png").convert("RGBA")
    threshold = 100

    img = image.convert("RGB")

    gray = img.convert("L")
    binary = gray.point(lambda p: 255 if p > threshold else 0, mode="1")
    inv = ImageOps.invert(binary.convert("L"))
    bbox = inv.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        cropped.save(f"{out_path}/{filename.replace('.png', '')}.bmp")
    else:
        img.save(f"{out_path}/{filename.replace('.png', '')}.bmp")

if __name__ == '__main__':
    img_t = Image.open(r"C:\Users\sojun\github\mp-word\ref\tool\image_convert\img\word_removed\busy.png").convert("RGB")
    remove_background(img_t, 'busy', "../img/remove_white_background")
