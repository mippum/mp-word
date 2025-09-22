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
#    "sentence": "Hello! I am Jina.",
#    "concept": "a friendly greeting, person waving, smiling"
# }, {
   "sentence": "My name is Jina.",
   "concept": "a person introducing themselves, pointing to self, smiling"
}, {
   "sentence": "Nice to meet you.",
   "concept": "two people meeting, shaking hands, friendly expression"
}, {
   "sentence": "What is your name?",
   "concept": "a person asking a question, pointing at another person, curious expression"
}, {
   "sentence": "Hi! I'm Tom.",
   "concept": "a cheerful greeting, person smiling and waving"
}, {
   "sentence": "Nice to meet you, too.",
   "concept": "two people smiling and shaking hands in response"
}, {
   "sentence": "Good morning!",
   "concept": "a person greeting in the morning, sun rising in the background"
}, {
   "sentence": "How are you?",
   "concept": "a person asking kindly, open hand gesture, friendly face"
}, {
   "sentence": "I am fine.",
   "concept": "a smiling person showing thumbs up, looking well"
}, {
   "sentence": "See you later!",
   "concept": "a person waving goodbye while walking away"
}, {
   "sentence": "Goodbye!",
   "concept": "a person waving hand in farewell"
}, {
   "sentence": "What is this?",
   "concept": "a person pointing at an object nearby, questioning expression"
}, {
   "sentence": "It is a book.",
   "concept": "an open book being shown clearly"
}, {
   "sentence": "What is that?",
   "concept": "a person pointing at something far away, curious look"
}, {
   "sentence": "It's a pencil.",
   "concept": "a pencil being held up or shown clearly"
}, {
   "sentence": "Do you have a dog?",
   "concept": "a person asking about a pet dog, with a dog nearby"
}, {
   "sentence": "I have a lot of dogs.",
   "concept": "a person surrounded by several dogs, smiling happily"
}, {
   "sentence": "How many do you have?",
   "concept": "a person counting with fingers, asking curiously"
}, {
   "sentence": "Five dogs.",
   "concept": "five dogs grouped together near a person"
}, {
   "sentence": "Do you have a dog too?",
   "concept": "two people talking, one asking if the other also has a dog"
}, {
   "sentence": "No, I have a cat.",
   "concept": "a person pointing to a cat, shaking head"
}, {
   "sentence": "What color is it?",
   "concept": "a person asking about the color of an animal or object"
}, {
   "sentence": "It's black.",
   "concept": "a black-colored cat shown clearly"
}, {
   "sentence": "Do you like pizza?",
   "concept": "a person asking while holding a slice of pizza"
}, {
   "sentence": "No, I do not like it.",
   "concept": "a person rejecting food by waving hand, pizza nearby"
}, {
   "sentence": "Do you like hamburgers?",
   "concept": "a person asking while holding a hamburger"
}, {
   "sentence": "No, I don't like it.",
   "concept": "a person rejecting food by waving hand, hamburger nearby"
}, {
   "sentence": "What's your favorite food?",
   "concept": "a person asking about favorite food, curious face"
}, {
   "sentence": "I like bananas.",
   "concept": "a person happily holding a bunch of bananas"
}, {
   "sentence": "Do you like sports?",
   "concept": "a person asking with a ball in hand"
}, {
   "sentence": "Yes, I do.",
   "concept": "a person nodding with a positive expression, thumbs up"
}, {
   "sentence": "What kind of sport do you like?",
   "concept": "a person asking about sports, ball nearby"
}, {
   "sentence": "I like basketball.",
   "concept": "a person playing basketball, holding or shooting a ball"
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
   "concept": "a person holding a single apple in their hand"
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

        # os.makedirs(f'jpg-images/', exist_ok=True)
        # os.makedirs(f'jpg-images/{word.lower()}/sentences', exist_ok=True)

        for idx, generated_image in enumerate(response.generated_images):
            image_bytes = generated_image.image.image_bytes

            image = Image.open(io.BytesIO(image_bytes))
            print(image.format)

            filename = f"jpg-images/{safe_filename(sentence)}.jpg"
            # with open(filename, "wb") as f:
            if idx > 0:
                filename += f'_{idx}'
            image.save(filename, format="JPEG", quality=90)
            print(f"Saved image to {filename}")

if __name__ == '__main__':
    run()
