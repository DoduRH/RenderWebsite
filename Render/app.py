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
    data = request.form['body']
    #data = request.data
    print(data)
    t, csv_name, vid_name, audio_name, offset, video_usable, audio_usable, font, font_size, vid_speed, audio_speed, view_shadow, text_colour, shadow_colour, video_fade, audio_fade, crop_vid, crop_aud = json.loads(data)

    result = render(t, csv_name, vid_name, audio_name, offset, video_usable, audio_usable, font, font_size, vid_speed, audio_speed, view_shadow, text_colour, shadow_colour, video_fade, audio_fade, crop_vid, crop_aud)

    if result == "ERROR":
        return render_template("invalid", filename="Error, no audio detected")

    return t


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)

'''@app.route('/uploader', methods=['GET', 'POST'])
def uploader():
    if request.method == 'POST':
        t = uuid4()
        r = request
        print(list(r.form.keys()))

        font_size = int(get_value(r, 'font_size', 50))
        vid_start = float(get_value(r, 'vid_start', 0))
        audio_start = float(get_value(r, 'audio_start', 0))
        font = get_value(r, 'font', 'Arial-Bold')
        offset = (int(get_value(r, 'offset_x', 0)), int(get_value(r, 'offset_y', 0)))
        vid_speed = float(get_value(r, 'vid_speed', 1))
        audio_speed = float(get_value(r, 'audio_speed', 1))
        view_shadow = get_value(r, 'visibleShadow', 'off') == 'on'
        text_colour = get_value(r, 'textColour', '#000000')
        shadow_colour = get_value(r, 'shadowColour', '#ffffff')
        fade_in = float(get_value(r, 'fade_in', 0))
        fade_out = float(get_value(r, 'fade_out', 0))
        crop_vid = get_value(r, 'crop_vid', 'off') == 'on'
        crop_aud = get_value(r, 'crop_aud', 'off') == 'on'

        vid = r.files.get('vid')
        if vid.filename != '':
            vid_name = 'content/vid_' + str(t) + "." + secure_filename(vid.filename.split(".")[-1])
            vid.save(vid_name)
            mime = get_mimetype(vid_name).split("/")
            if mime[0] != "video":  # Check mimetype is video
                os.remove(vid_name)
                return render_template("invalid.html", filename=vid_name)
        else:
            return redirect()

        audio = r.files.get('audio')
        if audio.filename != '':
            audio_name = 'content/audio_' + str(t) + "." + secure_filename(audio.filename.split(".")[-1])
            audio.save(audio_name)
            if (mime[0] != "audio" and mime[0] != "video"):  # Check mimetype is audio
                os.remove(audio_name)
                return render_template("invalid.html", filename=audio_name)
        else:
            audio_name = None

        csv_contents = get_value(r, 'csvFile', '').replace("\r\n", "\n").strip()

        if csv_contents == '':
            return redirect(url_for('home'))

        data = list(csv.reader(csv_contents.split("\n"), quoting=csv.QUOTE_NONNUMERIC))

        if audio_speed != 1 or audio_start != 0:
            for i, row in enumerate(data):
                for j, cell in enumerate(row[1:]):
                    data[i][j+1] = str(max(0, round((float(cell) - audio_start) * (1/audio_speed), 2)))

        csv_name = 'content/csv_' + str(t) + ".csv"
        with open(csv_name, "a+", newline='') as f:
            wr = csv.writer(f, quoting=csv.QUOTE_ALL)
            wr.writerows(data)

        # print(csv_name, vid_name, audio_name, offset, vid_start, font, font_size, vid_speed, audio_speed, text_colour, shadow_colour)
        result = render(t, csv_name, vid_name, audio_name, offset, vid_start, audio_start, font, font_size, vid_speed, audio_speed, view_shadow, text_colour, shadow_colour, fade_in, fade_out, crop_vid, crop_aud)

        if result == "ERROR":
            return render_template("invalid", filename="Error, no audio detected")

        return redirect(url_for('hold', vid_id=t))'''
