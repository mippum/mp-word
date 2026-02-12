import os
import csv
import uuid6

# greenydot_word_path = r'C:\Users\USER\github\greenydot_flight_api\flight-app\public\static\mp-word\words'
asset_path = r'C:\Users\wogud\github\mp-word\assets\images\words'


# def copy_from_greenydot():
#     pass

def run():

    for word in os.listdir(asset_path):
        # print(os.path.join(asset_path, word))
        os.rename(os.path.join(asset_path, word),
                  os.path.join(asset_path, '_' + word))
        pass
    pass

if __name__ == '__main__':
    run()
