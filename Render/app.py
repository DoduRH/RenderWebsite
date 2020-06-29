from flask import Flask, render_template, request
from video_renderer import render
import json

import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "addlyrics-ed88c47e7d9d.json"

app = Flask(__name__)

@app.route("/")
def index():
    return "Hello world"

@app.route('/render', methods=['GET', 'POST'])
def main():
    # Testing data
    data = request.form['body']
    # Google run
    #data = request.data
    print(data)
    t, csv_name, video_name, audio_name, background_colour, text_position, text_width, video_usable, audio_usable, font, font_size, video_speed, audio_speed, view_shadow, shadow_offset, text_colour, shadow_colour, video_fade, audio_fade, crop_video, crop_audio = json.loads(data)

    result = render(t, csv_name, video_name, audio_name, background_colour, text_position, text_width, video_usable, audio_usable, font, font_size, video_speed, audio_speed, view_shadow, shadow_offset, text_colour, shadow_colour, video_fade, audio_fade, crop_video, crop_audio)
    if "error" == result[0:5].lower():
        print("Error while rendering:", result)
        return render_template("invalid", filename=result[5:])

    return t


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
