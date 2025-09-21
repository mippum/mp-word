from google import genai
from google.genai import types
import os
from PIL import Image
import io
import re

with open(r"C:\Users\USER\.gloud\gapi.txt", 'r') as f:
    GOOGLE_API_KEY = f.read()

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\USER\.gloud\greenyant-d228b780dccc.json"

client = genai.Client(api_key=GOOGLE_API_KEY)

# Windows 예약어 목록
WINDOWS_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}

def safe_filename(text: str, replace_with: str = "_") -> str:
    text = re.sub(r'[\\/:*?"<>|\r\n\t]', replace_with, text)
    text = text.strip()
    text = text.rstrip(". ")
    text = text[:255]
    if text.upper() in WINDOWS_RESERVED:
        text = f"_{text}_"
    return text

def run():
    word = 'Hello'
    sentence = "Hello! I’m Jina."
    concept = 'a friendly greeting from a woman, waving and smiling.'

    prompt = f'''A simple black-and-white line drawing on a white background, using only thin black lines, no shading, no colors.
Minimalist, hand-drawn style.
Concept: {concept}
Do not include any text, letters, or numbers in the drawing.
Keep the composition simple and clear.'''

    response = client.models.generate_images(
        model='imagen-3.0-generate-002',
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type='image/jpeg',
        )
    )

    os.makedirs(f'jpg-images/{word.lower()}', exist_ok=True)
    os.makedirs(f'jpg-images/{word.lower()}/sentences', exist_ok=True)

    for idx, generated_image in enumerate(response.generated_images):
        image_bytes = generated_image.image.image_bytes

        image = Image.open(io.BytesIO(image_bytes))
        print(image.format)

        filename = f"jpg-images/{word.lower()}/sentences/{safe_filename(sentence)}.jpg"
        with open(filename, "wb") as f:
            image.save(filename, format="JPEG", quality=90)
        print(f"Saved image to {filename}")

if __name__ == '__main__':
    run()
