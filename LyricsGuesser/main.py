from flask import Flask, request, jsonify
from flask_cors import CORS
import json


import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "addlyrics-ed88c47e7d9d.json"

app = Flask(__name__)
CORS(app)

@app.route('/lyrics-api', methods=['POST'])
def lyrics_adder():
    data = json.loads(request.data)

    video_id = data.get("video_id")
    lyrics = data.get("lyrics").split("\n")
    uploaded_ext = data.get("filename").split(".")[-1]

    filename = f"video_{video_id}.{uploaded_ext}"

    #print(f"{lyrics} {video_id}")
    return jsonify({"timings": [["a", 1, 5], ["b", 5, 10], ["c", 10, 20]]})