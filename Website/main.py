from flask import Flask, render_template, request, send_file, send_from_directory, redirect, url_for, jsonify
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

app = Flask(__name__)

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "addlyrics-d6f3c94c49de.json"

MAX_MEDIA_SIZE = 300000000  # 300MB between audio and video

uploadBucketName = "addlyrics-content"
path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
uploadClient = storage.Client.from_service_account_json(path)
downloadBucket = uploadBucket = uploadClient.get_bucket(uploadBucketName)


def upload_blob(bucket_name, source_file_name, destination_blob_name):
    """Uploads a file to the bucket."""
    # bucket_name = "your-bucket-name"
    # source_file_name = "local/path/to/file"
    # destination_blob_name = "storage-object-name"

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    blob.upload_from_filename(source_file_name)

    print(
        "File {} uploaded to {}.".format(
            source_file_name, destination_blob_name
        )
    )


def check_blob(bucket_name, blob_name):
    """Checks a blob exists in the bucket."""
    # bucket_name = "your-bucket-name"
    # blob_name = "storage-object-name"

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    stats = storage.Blob(bucket=bucket, name=blob_name).exists(storage_client)

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
    
    if not check_blob(bucket_name, blob_name):
        return 0

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

def is_valid_uuid(uuid_to_test, version=4):
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except ValueError:
        return False

    return str(uuid_obj) == uuid_to_test


@app.route("/")
def home():
    return render_template('home.html', version=1)


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


def delay_delete(delay, path):
    sleep(delay)
    try:
        os.remove(path)
    except Exception as error:
        app.logger.error("Error removing or closing downloaded file handle", error)
    print("Deleted", path)
    return


@app.route("/prev")
def prev():
    r = request
    maincol = get_args(r, "maincol", "ffffff")
    visible = get_args(r, "visible", "true") == "true"
    shadow = get_args(r, "shadow", "000000")
    fontsize = get_args(r, "fontsize", 100)
    offsetx = get_args(r, "offsetx", 0)
    offsety = get_args(r, "offsety", 0)
    dimx = get_args(r, "dimx", 1920)
    dimy = get_args(r, "dimy", 1080)

    img_loc = generate_img('#' + maincol, bool(visible), '#' + shadow, int(fontsize), (int(offsetx), int(offsety)), (int(dimx), int(dimy)))

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
        error("invalid uuid", uuid)

    mime = guessmime(filename)[0]
    if purpose == "audioUpload" and ("audio" in mime or "video" in mime):
        filename = "audio_" + uuid + "." + filename.split(".")[-1]
    elif purpose == "videoUpload" and "video" in mime:
        filename = "vid_" + uuid + "." + filename.split(".")[-1]
    else:
        print("Invalid purpose", purpose, mime)
        error("Invalid purpose", purpose, mime)

    blob = uploadBucket.blob(filename)
    url = blob.generate_signed_url(
        expiration=timedelta(minutes=60),
        method='PUT', version="v4")
    return url


@app.route("/video")
def render_video_page():
    return app.send_static_file('html/video.html')


@app.route('/hold/<vid_id>')
def hold(vid_id):
    return render_template('hold.html', vid_id=vid_id)


@app.route('/uploader', methods=['GET', 'POST'])
def uploader():
    print("Uploading", request.method)
    if request.method == 'POST':
        r = request
        print(list(r.form.keys()))

        filename = get_value(r, 'uuid')
        if not is_valid_uuid(filename):
            error("Invalid filename", filename)
        t = filename

        video_name = "vid_" + t + "." + get_value(r, 'videoType', "")
        if not check_blob("addlyrics-content", video_name):
            print("Unable to find video")
            error("error, video upload failed")
        else:
            video_size = size_blob(uploadBucketName, video_name)

        ext = get_value(r, 'audioType', "")
        if ext == "":
            audio_name = None
            audio_size = 0
        else:
            audio_name = "audio_" + t + "." + ext
            if not check_blob("addlyrics-content", audio_name):
                error("error, audio not uploaded")
            else:
                audio_size = size_blob(uploadBucketName, audio_name)

        if video_size + audio_size > MAX_MEDIA_SIZE:
            error("error, files too big.  Combined file size of {} bytes excedes expected file size of {} bytes".format(video_size + audio_size, MAX_MEDIA_SIZE))

        font_size = int(get_value(r, 'font_size', 50))
        video_usable = (float(get_value(r, 'vid_start', 0)), float(get_value(r, 'vid_end', 0)))
        audio_usable = (float(get_value(r, 'audio_start', 0)), float(get_value(r, 'audio_end', 0)))
        font = get_value(r, 'font', 'Arial-Bold')
        text_position = get_value(r, "text_position", "mm")
        text_width = float(get_value(r, "text_width", 90))/100
        vid_speed = float(get_value(r, 'vid_speed', 1))
        audio_speed = float(get_value(r, 'audio_speed', 1))
        view_shadow = get_value(r, 'visibleShadow', 'off') == 'on'
        text_colour = get_value(r, 'textColour', '#000000')
        shadow_colour = get_value(r, 'shadowColour', '#ffffff')
        video_fade = (float(get_value(r, 'video_fade_in', 0)), float(get_value(r, 'video_fade_out', 0)))
        audio_fade = (float(get_value(r, 'audio_fade_in', 0)), float(get_value(r, 'audio_fade_out', 0)))
        crop_vid = get_value(r, 'crop_vid', 'off') == 'on'
        crop_aud = get_value(r, 'crop_aud', 'off') == 'on'

        # CSV file
        csv_contents = get_value(r, 'csvFile', '').replace("\r\n", "\n").strip()

        if csv_contents != '':
            data = list(csv.reader(csv_contents.split("\n"), quoting=csv.QUOTE_NONNUMERIC))

            if audio_speed != 1 or audio_usable[0] != 0:
                for i, row in enumerate(data):
                    for j, cell in enumerate(row[1:]):
                        data[i][j+1] = str(max(0, round((float(cell) - audio_usable[0]) * (1/audio_speed), 2)))

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
            error("Audio timestamps don't make sense")
        
        if video_usable[1] != 0 and video_usable[1] <= video_usable[0]:
            error("Video timestamps don't make sense")

        # Create arguments for the queue
        args = [str(t), csv_name, video_name, audio_name, text_position, text_width, video_usable, audio_usable, font, font_size, vid_speed, audio_speed, view_shadow, text_colour, shadow_colour, video_fade, audio_fade, crop_vid, crop_aud]

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

        print('Created task {}'.format(response.name))
        return redirect(url_for('hold', vid_id=t))


@app.route('/get_file', methods=['GET', 'POST'])
def get_file():
    if request.method == 'POST':
        r = request
        data = json.loads(r.data)
        vid_id = data['vid_id']
        path = "Video_" + vid_id + ".mp4"
        if check_blob("addlyrics-content", path):
            return jsonify({"progress": "done"})
        else:
            return jsonify({"progress": "nothing"})
    else:
        return redirect(url_for('home'))


@app.route('/download/<vid_id>', methods=['GET'])
def download(vid_id):
    if request.method == 'GET':
        path = "Video_" + vid_id + ".mp4"
        if not check_blob("addlyrics-content", path):
            return render_template('home.html', version=4)

        blob = downloadBucket.blob(path)
        url = blob.generate_signed_url(
            expiration=timedelta(minutes=60),
            method='GET', version="v4", 
            response_disposition='attachment; filename=AddmylyricsVideo.mp4')

        print("downloading")
        return redirect(url)

    return render_template('home.html', version=3)


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    print("Starting server")
    app.run(host='127.0.0.1', port=8087, debug=True)
