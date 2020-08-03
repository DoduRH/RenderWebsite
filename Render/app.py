from flask import Flask, render_template, request
from video_renderer import render
import json
import sqlConnector

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
    # data = request.data
    print(data)
    args = json.loads(data)

    result = render(args)
    if result[0] == "error":
        print("Error while rendering:", result)
        data = {
            "error": result[1]
        }
        sqlConnector.set_document(args['video_id'], data, merge=True)

    return args["video_id"]


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)
