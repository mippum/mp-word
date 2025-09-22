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

sentence_concepts = [
    # {
#    "sentence": "Hello! I am Jina.",
#    "concept": "a friendly greeting from a woman, waving and smiling."
# }, {
#    "sentence": "My name is Jina.",
#    "concept": "a woman introducing themselves, pointing to self, smiling"
# }, {
#    "sentence": "Nice to meet you.",
#    "concept": "two people(a man and a woman) meeting, shaking hands, friendly expression"
# }, {
#    "sentence": "What is your name?",
#    "concept": "a woman asking a question, pointing at a man, curious expression, the man smiling and waiting for the question."
# }, {
#    "sentence": "Hi! I'm Tom.",
#    "concept": "a cheerful greeting, a man smiling and waving"
# }, {
#    "sentence": "Nice to meet you, too.",
#    "concept": "two people(a man and a woman) smiling and shaking hands in response"
# }, {
#    "sentence": "Good morning!",
#    "concept": "a man smiling and greeting in the morning, sun rising slightly in the background"
# }, {
#    "sentence": "How are you?",
#    "concept": "a man asking kindly, open hand gesture, friendly face"
# }, {
#    "sentence": "I am fine.",
#    "concept": "a smiling woman showing thumbs up, looking well"
# }, {
#    "sentence": "See you later!",
#    "concept": "a woman waving goodbye while walking away"
# }, {
#    "sentence": "Goodbye!",
#    "concept": "a man waving hand in farewell"
# }, {
#    "sentence": "What is this?",
#    "concept": "a woman pointing at an object nearby, questioning expression"
# }, {
#    "sentence": "It is a book.",
#    "concept": "an open book being shown clearly"
# }, {
#    "sentence": "What is that?",
#    "concept": "a woman pointing at something far away, curious look"
# }, {
#    "sentence": "It's a pencil.",
#    "concept": "a pencil being held up or shown clearly"
# }, {
#    "sentence": "Do you have a dog?",
#    "concept": "a woman asking a question, with a dog nearby"
# }, {
#    "sentence": "I have a lot of dogs.",
#    "concept": "a man with three dogs nearby, smiling happily"
# }, {
#    "sentence": "How many do you have?",
#    "concept": "a woman counting with fingers to the three dogs, asking curiously"
# }, {
#    "sentence": "Five dogs.",
#    "concept": "five dogs grouped together near a man"
# }, {
#    "sentence": "Do you have a dog too?",
#    "concept": "two people(a man and a woman) talking, the man asking a question near by three dogs"
# }, {
#    "sentence": "No, I have a cat.",
#    "concept": "a woman pointing to a cat, shaking head"
# }, {
#    "sentence": "What color is it?",
#    "concept": "a man asking a question to a woman, the man pointing to a cat, the woman smiling and waiting for the question"
# }, {
#    "sentence": "It's black.",
#    "concept": "A cat as black as pitch, shown clearly"
# }, {
#    "sentence": "Do you like pizza?",
#    "concept": "a man asking while holding a slice of pizza"
# }, {
#    "sentence": "No, I do not like it.",
#    "concept": "a woman rejecting food by waving hand, pizza nearby"
# }, {
#    "sentence": "Do you like hamburgers?",
#    "concept": "a man asking while holding a hamburger"
# }, {
#    "sentence": "No, I don't like it.",
#    "concept": "a woman rejecting food by waving hand, hamburger nearby"
# }, {
#    "sentence": "What's your favorite food?",
#    "concept": "a man asking a question nearby a pizza, a hamburger, a pasta, curious face"
# }, {
#    "sentence": "I like bananas.",
#    "concept": "a woman happily holding a bunch of bananas"
# }, {
#    "sentence": "Do you like sports?",
#    "concept": "a man wearing a tracksuit and asking nearby a ball"
# }, {
#    "sentence": "Yes, I do.",
#    "concept": "a woman nodding with a positive expression, thumbs up"
# }, {
#    "sentence": "What kind of sport do you like?",
#    "concept": "a man wearing a tracksuit asking a question, ball nearby"
# }, {
#    "sentence": "I like basketball.",
#    "concept": "a woman playing basketball, holding or shooting a ball"
# }, {
#    "sentence": "She likes me.",
#    "concept": "a girl smiling warmly at a boy"
# }, {
#    "sentence": "He is tall.",
#    "concept": "a tall man standing next to something shorter for comparison"
# }, {
#    "sentence": "The man is tall.",
#    "concept": "a tall man standing upright, clearly taller than average"
# }, {
#    "sentence": "I have one apple.",
#    "concept": "a man holding a single apple in his hand"
# }, {
#    "sentence": "We are going to the park.",
#    "concept": "a group of people walking together toward a park with trees"
# }, {
#    "sentence": "The boy runs fast.",
#    "concept": "a boy running quickly with motion lines"
# }, {
#     "sentence": "The girl is happy.",
#     "concept": "a smiling girl with cheerful expression"
# }, {
#     "sentence": "She is my friend.",
#     "concept": "two people standing together, smiling warmly"
# }, {
#     "sentence": "This is my house.",
#     "concept": "a small simple house, someone pointing at it"
# }, {
#     "sentence": "I go to school every day.",
#     "concept": "a child walking with a backpack toward a school building"
# }, {
#     "sentence": "We eat lunch together.",
#     "concept": "two or more people sitting at a table sharing food"
# }, {
#     "sentence": "The dog is sleeping on the couch.",
#     "concept": "a dog curled up, sleeping on a sofa"
# }, {
#     "sentence": "I am first in line.",
#     "concept": "a little tall man standing at the front of a one line of ten people"
# }, {
#     "sentence": "This is the last piece of cake.",
#     "concept": "a plate with one small piece of cake left"
# }, {
#     "sentence": "I am here.",
#     "concept": "a person raising a hand to show presence"
# }, {
#     "sentence": "There is a park near my house.",
#     "concept": "a house with a nearby park with trees and grass"
# }, {
#     "sentence": "They are my friends.",
#     "concept": "a group of people(five people) smiling together"
# }, {
#     "sentence": "The cat is in the box.",
#     "concept": "a cat sitting inside an open box"
# }, {
#     "sentence": "The book is on the table.",
#     "concept": "a single book resting on a table"
# }, {
#     "sentence": "I am at home.",
#     "concept": "a person inside a simple house"
# }, {
#     "sentence": "I drink a lot of water every day.",
#     "concept": "a person holding a glass of water, drinking"
# }, {
#     "sentence": "He climbed up the ladder.",
#     "concept": "a person climbing a tall ladder"
# }, {
#     "sentence": "Please turn off the lights.",
#     "concept": "A boy in bed points to a ceiling light and asks his mother, who is at the switch next to the door, for a favor."
# }, {
#     "sentence": "I have a pen and a book.",
#     "concept": "a pen and a book placed together"
# }, {
#     "sentence": "This gift is for you.",
#     "concept": "a person offering a wrapped gift box to another"
# }, {
#     "sentence": "Please come here.",
#     "concept": "a person beckoning with one hand"
# }, {
#     "sentence": "I want a cup of tea.",
#     "concept": "a steaming cup of tea on a saucer"
# }, {
#     "sentence": "I drink water.",
#     "concept": "a person drinking from a glass of water"
# }, {
#     "sentence": "I get a new book.",
#     "concept": "a person receiving a book with a smile"
# }, {
#     "sentence": "The day is sunny.",
#     "concept": "a bright sun shining in the sky"
# }, {
#     "sentence": "The night is quiet.",
#     "concept": "a calm night sky with stars and a moon"
# }, {
#     "sentence": "Today is a beautiful day.",
#     "concept": "a sunny sky, flowers, and happy atmosphere"
# }, {
#     "sentence": "The woman is reading a book.",
#     "concept": "a woman sitting and reading a book"
# }, {
#     "sentence": "We have a meeting tomorrow.",
#     "concept": "people sitting at a table discussing something"
# }, {
#     "sentence": "The sun is shining brightly today.",
#     "concept": "a big shining sun in a clear sky and some cloud, some trees"
# }, {
#     "sentence": "It will rain later.",
#     "concept": "dark clouds with raindrops starting to fall"
# }, {
#     "sentence": "The food tastes bad.",
#     "concept": "a person tasting food with a displeased face"
# }, {
#     "sentence": "The house is big.",
#     "concept": "a large house with many windows"
# }, {
#     "sentence": "I am going to the party with my friends.",
#     "concept": "a group of people walking together with balloons or music notes"
# }, {
#     "sentence": "I am from Korea.",
#     "concept": "a person pointing to a region of korea on a simple korea map"
# }, {
#     "sentence": "Do you want tea or coffee?",
#     "concept": "a cup of tea and a cup of coffee side by side"
# }, {
#     "sentence": "All the students are here.",
#     "concept": "a group of students sitting together in a classroom"
#   }, {
#     "sentence": "We ate lunch after class.",
#     "concept": "students sitting at a table eating lunch together"
# }, {
#     "sentence": "I bought a new car.",
#     "concept": "a person happily standing next to a shiny car"
# }, {
#     "sentence": "I can swim.",
#     "concept": "a person swimming in water with arms outstretched"
# }, {
#     "sentence": "We go out for a walk.",
#     "concept": "two people walking together outdoors on a path"
# }, {
#     "sentence": "What time does the movie start?",
#     "concept": "In a movie theater, a man points to his watch and asks a woman a question."
# }, {
#     "sentence": "I am busy now.",
#     "concept": "a person surrounded by papers or working at a desk"
# }, {
#     "sentence": "Do you have any money?",
#     "concept": "a hand holding coins or a wallet"
# }, {
#     "sentence": "He walks down the hill.",
#     "concept": "a person walking downhill on a slope"
# }, {
#     "sentence": "I have to work tomorrow.",
#     "concept": "a person working at a desk"
# }, {
#     "sentence": "The store is open now.",
#     "concept": "a shop with an 'open' sign on the door (without text)"
# }, {
#     "sentence": "The weather is very cold today.",
#     "concept": "a person shivering in the snow, wearing a scarf"
# }, {
#     "sentence": "I think this is a good idea.",
#     "concept": "a person with a lightbulb over their head, smiling"
# }, {
#     "sentence": "Open the window for some fresh air.",
#     "concept": "a hand pushing open a window with breeze coming in"
# }, {
#     "sentence": "You are right about that.",
#     "concept": "A man smiles and gives an OK sign."
# }, {
#     "sentence": "She came back home.",
#     "concept": "a person arriving at a house with a welcoming gesture"
# }, {
#     "sentence": "There are many people in the room.",
#     "concept": "a crowded small room with 20 people standing together"
# }, {
#     "sentence": "I make a sandwich.",
#     "concept": "a person placing ingredients between slices of bread"
# }, {
#     "sentence": "I want a cup of tea.",
#     "concept": "a steaming teacup placed on a saucer"
# }, {
#     "sentence": "Wash your hands before dinner.",
#     "concept": "hands under running water at a sink in the toilet"
# }, {
#     "sentence": "I really like this song.",
#     "concept": "a person listening to music with headphones and smiling"
# }, {
#     "sentence": "What did you say?",
#     "concept": "a person cupping their ear, asking for clarification"
# }, {
#     "sentence": "The road is long and winding.",
#     "concept": "a long winding road stretching into the distance"
# }
]


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
