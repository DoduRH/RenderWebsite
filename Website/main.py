from flask import Flask, render_template, request, send_file, send_from_directory, redirect, url_for, jsonify
from flask_cors import CORS
from img_preview import generate_img
import os
import json
import csv
from uuid import uuid4, UUID
from google.cloud import storage
from google.cloud import tasks_v2
from datetime import timedelta
from mimetypes import guess_type as guessmime
from time import sleep
import threading
from re import compile as reg
import sqlConnector
import datetime
import base64

app = Flask(__name__)
CORS(app)

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "addlyrics-d6f3c94c49de.json"

MAX_MEDIA_SIZE = 310000000  # 300MB between audio and video

uploadBucketName = "addlyrics-content"
path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
uploadClient = storage.Client.from_service_account_json(path)
downloadBucket = uploadBucket = uploadClient.get_bucket(uploadBucketName)

rrggbbString = reg(r'#[a-fA-F0-9]{6}$')


@app.before_request
def before_request():
    if request.url.startswith('http://'):
        url = request.url.replace('http://', 'https://', 1)
        code = 301
        return redirect(url, code=code)


def upload_blob(bucket_name, source_file_name, destination_blob_name):
    """Uploads a file to the bucket."""
    # bucket_name = "your-bucket-name"
    # source_file_name = "local/path/to/file"
    # destination_blob_name = "storage-object-name"

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    print(
        "Uploading file {} to {}.".format(
            source_file_name, destination_blob_name
        ),
        end=""
    )

    blob.upload_from_filename(source_file_name)

    print("Success")


def blob_exists(bucket_name, blob_name, output=True):
    """Checks a blob exists in the bucket."""
    # bucket_name = "your-bucket-name"
    # blob_name = "storage-object-name"

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    stats = storage.Blob(bucket=bucket, name=blob_name).exists(storage_client)
    if output:
        print(
            "File {} exists {}.".format(
                blob_name, str(stats)
            )
        )

    return stats

def size_blob(bucket_name, blob_name):
    """Returns a blob's size in bytes."""
    # bucket_name = "your-bucket-name"
    # blob_name = "storage-object-name"

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    size = bucket.get_blob(blob_name).size

    print(
        "File {} has size {} bytes.".format(
            blob_name, str(size)
        )
    )

    return size

def error(*msg):
    return render_template("invalid.html", message=" ".join(msg))

def get_value(r, name, default=None):
    if name in r.form.keys():
        return r.form[name]
    else:
        return default

def get_args(r, name, default=None):
    if name in r.args.keys():
        return r.args.get(name)
    else:
        return default

def get_from_dict(d, name, default=None):
    if name in d.keys():
        return d.get(name)
    else:
        return default

def is_valid_uuid(uuid_to_test, version=4):
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except ValueError:
        return False

    return str(uuid_obj) == uuid_to_test


def is_valid_colour(str_to_test):
    return bool(rrggbbString.match(str_to_test))


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static/favicon'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


def delay_delete(delay, path):
    sleep(delay)
    try:
        os.remove(path)
    except Exception as error:
        print("Error removing or closing downloaded file handle", error)
    print("Deleted", path)
    return


@app.route("/prev", methods=["POST"])
def prev():
    r = request
    try:
        maincol = '#' + get_from_dict(r.json, "maincol", "ffffff")
        background_type = get_from_dict(r.json, 'bgtype', "solid")
        background_colour = '#' + get_from_dict(r.json, 'background', "000000")
        visible = get_from_dict(r.json, "visible", "true")
        shadowcolour = '#' + get_from_dict(r.json, "shadow", "000000")
        fontsize = int(get_from_dict(r.json, "fontsize", 100))
        position = get_from_dict(r.json, "position", "mm")
        max_width = int(get_from_dict(r.json, "maxWidth", 90)) / 100
        text = get_from_dict(r.json, "text", "")
        shadow_offset = (int(get_from_dict(r.json, "shadx", 5)), int(get_from_dict(r.json, "shady", 5)))
        if (background_type != "solid"):
            image_data = get_from_dict(r.json, "media")
        else:
            image_data = ""
        video_top = int(get_from_dict(r.json, 'videoTop', 0))
        video_left = int(get_from_dict(r.json, 'videoLeft', 0))
        video_bottom = int(get_from_dict(r.json, 'videoBottom', 0))
        video_right = int(get_from_dict(r.json, 'videoRight', 0))
    except ValueError:
        return send_file("images/errorImage.jpg")  # make this an image eventually

    if shadowcolour == "#":
        shadowcolour = '#000000'
    if background_colour == "#":
        background_colour = '#000000'

    crop_image = [video_left, video_top, video_right, video_bottom]
    img_loc = generate_img(text, maincol, visible, background_type, background_colour, shadowcolour, shadow_offset, fontsize, position, max_width, image_data, crop_image)

    if 'error' in img_loc.lower():
        return send_file("images/errorImage")

    del_thread = threading.Thread(target=delay_delete, args=(5, img_loc))
    del_thread.start()

    return send_file(img_loc)

@app.route('/getUUID')
def getUUID():
    return json.dumps(str(uuid4()))

@app.route('/getSignedURL')
def getSignedURL():
    uuid = request.args.get('uuid')
    filename = request.args.get('filename')
    purpose = request.args.get('purpose')
    if not is_valid_uuid(uuid):
        print("Invalid UUID")
        return error("invalid uuid", uuid)

    mime = guessmime(filename)[0]
    if purpose == "audioUpload" and ("audio" in mime or "video" in mime):
        filename = "audio_" + uuid + "." + filename.split(".")[-1]
    elif purpose == "videoUpload" and ("video" in mime or "image" in mime):
        filename = "video_" + uuid + "." + filename.split(".")[-1]
    else:
        print("Invalid purpose", purpose, mime)
        return error("Invalid purpose", purpose, mime)

    blob = uploadBucket.blob(filename)
    url = blob.generate_signed_url(
        expiration=timedelta(minutes=60),
        method='PUT', version="v4")
    return url


@app.route("/video")
def render_video_page():
    return redirect(url_for("home"))


@app.route('/hold')
def hold():
    video_id = get_args(request, "videoID")
    return render_template('hold.html', video_id=video_id)


@app.route('/uploader', methods=['GET', 'POST'])
def uploader():
    if request.method == 'POST':
        r = request

        filename = get_value(r, 'uuid')
        if not is_valid_uuid(filename):
            return error("Invalid filename", filename)
        t = filename

        data = {
            'form': r.form,
            'progress': 0,
            'start-time': datetime.datetime.now()
        }
        sqlConnector.set_document(t, data, merge=True)

        video_ext = get_value(r, 'videoExt', "")
        video_name = "video_" + t + "." + video_ext
        if video_ext == "solid":
            video_name = ""
            video_size = 0
        elif not blob_exists("addlyrics-content", video_name):
            print("Unable to find video")
            return error("error, video upload failed")
        else:
            video_size = size_blob(uploadBucketName, video_name)

        ext = get_value(r, 'audioExt', "")
        if ext == "":
            audio_name = None
            audio_size = 0
        else:
            audio_name = "audio_" + t + "." + ext
            if not blob_exists("addlyrics-content", audio_name):
                return error("error, audio not uploaded")
            else:
                audio_size = size_blob(uploadBucketName, audio_name)

        if video_size + audio_size > MAX_MEDIA_SIZE:
            return error("error, files too big.  Combined file size of {} bytes excedes expected file size of {} bytes".format(video_size + audio_size, MAX_MEDIA_SIZE))

        try:
            font_size = int(get_value(r, 'font_size', 50))
            video_usable = [float(get_value(r, 'video_start', 0)), float(get_value(r, 'video_end', 0))]
            audio_usable = [float(get_value(r, 'audio_start', 0)), float(get_value(r, 'audio_end', 0))]
            font = get_value(r, 'font', 'Arial-Bold')
            text_position = get_value(r, "text_position", "mm")
            text_width = float(get_value(r, "text_width", 90))/100
            video_speed = float(get_value(r, 'video_speed', 1))
            audio_speed = float(get_value(r, 'audio_speed', 1))
            view_shadow = get_value(r, 'visibleShadow', 'off') == 'on'
            shadow_offset = [int(get_value(r, 'shadow_offset_x', 5)), int(get_value(r, 'shadow_offset_y', 5))]
            text_colour = get_value(r, 'textColour', 'ffffff')
            shadow_colour = get_value(r, 'shadowColour', '000000')
            background_colour = get_value(r, 'background_colour', '000000')
            video_fade = [float(get_value(r, 'video_fade_in', 0)), float(get_value(r, 'video_fade_out', 0))]
            audio_fade = [float(get_value(r, 'audio_fade_in', 0)), float(get_value(r, 'audio_fade_out', 0))]
            crop_video = get_value(r, 'crop_video', 'off') == 'on'
            crop_audio = get_value(r, 'crop_audio', 'off') == 'on'
            video_top = int(get_value(r, 'videoTop', 0))
            video_left = int(get_value(r, 'videoLeft', 0))
            video_bottom = int(get_value(r, 'videoBottom', 0))
            video_right = int(get_value(r, 'videoRight', 0))
        except ValueError:
            return error("Error, unable to interpret inputs")

        # Check colours are valid 6 character hex strings
        for col, name in ((text_colour, "text"), (shadow_colour, "shadow"), (background_colour, "background")):
            if not is_valid_colour(col):
                return error("Error, invalid", name, "colour")

        # CSV file
        csv_contents = get_value(r, 'csvFile', '').replace("\r\n", "\n").strip()
        word_count = 0

        if csv_contents != '':
            try:
                data = list(csv.reader(csv_contents.split("\n"), quoting=csv.QUOTE_NONNUMERIC))
            except:
                return error("Error, unable to interpret read timings")

            if audio_speed != 1 or audio_usable[0] != 0:
                for i, row in enumerate(data):
                    word_count += len(row[0].split(" "))
                    for j, cell in enumerate(row[1:]):
                        data[i][j+1] = str(max(0, round((float(cell) - audio_usable[0]) * (1/audio_speed), 2)))
            else:
                for i, row in enumerate(data):
                    word_count += len(row[0].split(" "))

            csv_name = 'csv_' + str(t) + ".csv"
            local_csv = "/tmp/" + csv_name
            with open(local_csv, "a+", newline='') as f:
                wr = csv.writer(f, quoting=csv.QUOTE_ALL)
                wr.writerows(data)

            upload_blob("addlyrics-content", local_csv, csv_name)
        else:
            csv_name = ""

        # Make sure usable audio and video are actually usable after uploading CSV blob
        if audio_usable[1] != 0 and audio_usable[1] <= audio_usable[0]:
            return error("Audio timestamps don't make sense")
        
        if video_usable[1] != 0 and video_usable[1] <= video_usable[0]:
            return error("Video timestamps don't make sense")

        crop_image = [video_left, video_top, video_right, video_bottom]

        for i, j in enumerate(crop_image):
            crop_image[i] = 2 * round(j / 2)
        
        if video_left > video_right and video_right != 0:
            error("Video croping doesn't make sense")
        
        if video_top > video_bottom and video_bottom != 0:
            error("Video croping doesn't make sense")

        args = {
            "video_id": str(t), 
            "csv_name": csv_name,
            "video_name": video_name,
            "audio_name": audio_name,
            "background_colour": background_colour,
            "text_position": text_position,
            "text_width": text_width,
            "video_usable": video_usable,
            "audio_usable": audio_usable,
            "font": font,
            "font_size": font_size,
            "video_speed": video_speed,
            "audio_speed": audio_speed,
            "view_shadow": view_shadow,
            "shadow_offset": shadow_offset,
            "text_colour": text_colour,
            "shadow_colour": shadow_colour,
            "video_fade": video_fade,
            "audio_fade": audio_fade,
            "crop_video": crop_video,
            "crop_audio": crop_audio,
            "crop_image": crop_image
        }

        data = {
            'args': args,
        }

        sqlConnector.set_document(t, data, merge=True)

        ##########
        # Q code #
        ##########
        client = tasks_v2.CloudTasksClient()

        # Values for q-ing
        project = 'addlyrics'
        queue = 'render-q'
        location = 'europe-west1'
        url = 'https://render-7cwyob5r6a-ew.a.run.app/render'
        payload = json.dumps(args)

        # Construct the fully qualified queue name.
        parent = client.queue_path(project, location, queue)

        # Construct the request body.
        task = {
            'http_request': {  # Specify the type of request.
                'http_method': 'POST',
                'url': url,  # The full url path that the task will be sent to.
                'oidc_token': {
                    'service_account_email': "tasker@addlyrics.iam.gserviceaccount.com"
                }
            }
        }

        # The API expects a payload of type bytes.
        converted_payload = payload.encode()

        # Add the payload to the request.
        task['http_request']['body'] = converted_payload

        # for debugging purposes
        import taskSim as client

        # Use the client to build and send the task.
        response = client.create_task(parent, task)

        return redirect(url_for('hold', videoID=t))


@app.route('/get_file', methods=['GET'])
def get_file():
    video_id = get_args(request, "videoID")
    progress = sqlConnector.get_progress(video_id)
    if progress is None:
        return jsonify({"progress": "ERROR"})
    else:
        return jsonify({"progress": progress})


@app.route('/download', methods=['GET'])
def download():
    video_id = get_args(request, "videoID")
    path = "VideoOutput_" + video_id + ".mp4"
    if not blob_exists("addlyrics-content", path):
        return error("Download not available")

    blob = downloadBucket.blob(path)
    url = blob.generate_signed_url(
        expiration=timedelta(minutes=60),
        method='GET', version="v4", 
        response_disposition='attachment; filename=AddmylyricsVideo.mp4')

    return redirect(url)


@app.route("/")
def home():
    return app.send_static_file('html/video.html')


@app.route('/contact')
def contact():
    return app.send_static_file('html/contact.html')


@app.route('/privacy-policy')
def privacy():
    return app.send_static_file('pdf/privacy-policy.pdf')


@app.route('/how-to')
def howto():
    return app.send_static_file('html/howto.html')


@app.route('/faq')
def faq():
    return app.send_static_file('html/faq.html')


@app.route('/robots.txt')
def robot():
    return app.send_static_file('robot/robots.txt')


@app.errorhandler(Exception)
def errorPage(e):
    print("Error occured from ip", request.remote_addr, "trying to access", request.base_url, "error", e)
    try:
        return error(str(e.code), e.description)
    except:
        return error("Somthing went wrong")


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    print("Starting server")
    app.run(host='127.0.0.1', port=8087, debug=True, ssl_context='adhoc')
