from google import genai
from google.genai import types
import os
from PIL import Image
import io
import re

# with open(r"C:\Users\USER\.gloud\gapi.txt", 'r') as f:
with open(r"C:\Users\wogud\.gcloud\gapi.txt", 'r') as f:
    GOOGLE_API_KEY = f.read()

# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\USER\.gloud\greenyant-d228b780dccc.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\wogud\.gcloud\greenyant-d228b780dccc.json"

client = genai.Client(api_key=GOOGLE_API_KEY)

sentence_concepts = [{
   "sentence": "Hello! I am Jina.",
   "concept": "a friendly greeting from a woman, waving and smiling."
}, {
   "sentence": "My name is Jina.",
   "concept": "a woman introducing themselves, pointing to self, smiling"
}, {
   "sentence": "Nice to meet you.",
   "concept": "two people(a man and a woman) meeting, shaking hands, friendly expression"
}, {
   "sentence": "What is your name?",
   "concept": "a woman asking a question, pointing at a man, curious expression, the man smiling and waiting for the question."
}, {
   "sentence": "Hi! I'm Tom.",
   "concept": "a cheerful greeting, a man smiling and waving"
}, {
   "sentence": "Nice to meet you, too.",
   "concept": "two people(a man and a woman) smiling and shaking hands in response"
}, {
   "sentence": "Good morning!",
   "concept": "a man smiling and greeting in the morning, sun rising slightly in the background"
}, {
   "sentence": "How are you?",
   "concept": "a man asking kindly, open hand gesture, friendly face"
}, {
   "sentence": "I am fine.",
   "concept": "a smiling woman showing thumbs up, looking well"
}, {
   "sentence": "See you later!",
   "concept": "a woman waving goodbye while walking away"
}, {
   "sentence": "Goodbye!",
   "concept": "a man waving hand in farewell"
}, {
   "sentence": "What is this?",
   "concept": "a woman pointing at an object nearby, questioning expression"
}, {
   "sentence": "It is a book.",
   "concept": "an open book being shown clearly"
}, {
   "sentence": "What is that?",
   "concept": "a woman pointing at something far away, curious look"
}, {
   "sentence": "It's a pencil.",
   "concept": "a pencil being held up or shown clearly"
}, {
   "sentence": "Do you have a dog?",
   "concept": "a woman asking a question, with a dog nearby"
}, {
   "sentence": "I have a lot of dogs.",
   "concept": "a man with three dogs nearby, smiling happily"
}, {
   "sentence": "How many do you have?",
   "concept": "a woman counting with fingers to the three dogs, asking curiously"
}, {
   "sentence": "Five dogs.",
   "concept": "five dogs grouped together near a man"
}, {
   "sentence": "Do you have a dog too?",
   "concept": "two people(a man and a woman) talking, the man asking a question near by three dogs"
}, {
   "sentence": "No, I have a cat.",
   "concept": "a woman pointing to a cat, shaking head"
}, {
   "sentence": "What color is it?",
   "concept": "a man asking a question to a woman, the man pointing to a cat, the woman smiling and waiting for the question"
}, {
   "sentence": "It's black.",
   "concept": "A cat as black as pitch, shown clearly"
}, {
   "sentence": "Do you like pizza?",
   "concept": "a man asking while holding a slice of pizza"
}, {
   "sentence": "No, I do not like it.",
   "concept": "a woman rejecting food by waving hand, pizza nearby"
}, {
   "sentence": "Do you like hamburgers?",
   "concept": "a man asking while holding a hamburger"
}, {
   "sentence": "No, I don't like it.",
   "concept": "a woman rejecting food by waving hand, hamburger nearby"
}, {
   "sentence": "What's your favorite food?",
   "concept": "a man asking a question nearby a pizza, a hamburger, a pasta, curious face"
}, {
   "sentence": "I like bananas.",
   "concept": "a woman happily holding a bunch of bananas"
}, {
   "sentence": "Do you like sports?",
   "concept": "a man wearing a tracksuit and asking nearby a ball"
}, {
   "sentence": "Yes, I do.",
   "concept": "a woman nodding with a positive expression, thumbs up"
}, {
   "sentence": "What kind of sport do you like?",
   "concept": "a man wearing a tracksuit asking a question, ball nearby"
}, {
   "sentence": "I like basketball.",
   "concept": "a woman playing basketball, holding or shooting a ball"
}, {
   "sentence": "She likes me.",
   "concept": "a girl smiling warmly at a boy"
}, {
   "sentence": "He is tall.",
   "concept": "a tall man standing next to something shorter for comparison"
}, {
   "sentence": "The man is tall.",
   "concept": "a tall man standing upright, clearly taller than average"
}, {
   "sentence": "I have one apple.",
   "concept": "a man holding a single apple in his hand"
}, {
   "sentence": "We are going to the park.",
   "concept": "a group of people walking together toward a park with trees"
}, {
   "sentence": "The boy runs fast.",
   "concept": "a boy running quickly with motion lines"
}]


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
    for sentence_concept in sentence_concepts[:1]:
        # word = 'Hello'
        sentence = sentence_concept['sentence']
        concept = sentence_concept['concept']

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

        for idx, generated_image in enumerate(response.generated_images):
            image_bytes = generated_image.image.image_bytes

            image = Image.open(io.BytesIO(image_bytes))
            print(image.format)

            filename = f"jpg-images/{safe_filename(sentence)}.jpg"
            if idx > 0:
                filename += f'_{idx}'
            image.save(filename, format="JPEG", quality=90)
            print(f"Saved image to {filename}")

if __name__ == '__main__':
    run()
