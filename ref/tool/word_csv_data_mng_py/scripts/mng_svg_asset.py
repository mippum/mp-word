import os
import csv
import uuid6
import shutil

# greenydot_word_path = r'C:\Users\USER\github\greenydot_flight_api\flight-app\public\static\mp-word\words'
asset_path = r'C:\Users\wogud\github\mp-word\assets\images\words'


# def copy_from_greenydot():
#     pass

def run():

    for word_folder_name in os.listdir(asset_path):

        # word = word_folder_name[1:]

        if os.path.exists(os.path.join(asset_path, word_folder_name, 'word_line_icon.svg')):
            os.remove(os.path.join(asset_path, word_folder_name, 'word_line_icon.svg'))

if __name__ == '__main__':
    run()
