import csv
import ffmpeg
from google.cloud import storage
from PIL import ImageFont
import os
from magic import Magic 

m = Magic(mime=True)


def download_blob(bucket_name, source_blob_name, filetype):
    """Downloads a blob from the bucket."""
    # bucket_name = "your-bucket-name"
    # source_blob_name = "storage-object-name"
    # destination_file_name = "local/path/to/file"

    storage_client = storage.Client()

    destination_file_name = "/tmp/" + source_blob_name

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name)

    fname = destination_file_name.split(".")[-1]

    mimetype = m.from_file(destination_file_name)
    if fname not in mimetype and filetype not in mimetype:
        os.remove(destination_file_name)
        print(
            "Blob {} deleted because mimetype didnt match".format(
                destination_file_name
            )
        )
        destination_file_name = ""
    else:
        print(
            "Blob {} downloaded to {}".format(
                source_blob_name, destination_file_name
            )
        )

    return destination_file_name


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


def wraptext(font, fontsize, text, width):
    f = ImageFont.truetype(font, size=fontsize)
    line = ""
    lines = []
    for i, word in enumerate(text.split(" ")):
        tmpline = line + " " + word
        if f.getsize(tmpline)[0] < width:
            line = tmpline
        else:
            lines.append(line.strip())
            line = word
    lines.append(line)
    return lines


# Take timed_words.csv of time stamped lines and put onto video.mp4
def render(vid_id, words_loc, video_loc, audio_loc, text_offset, vid_start, audio_start, font, fontsize, video_speed, audio_speed, shadow_visible, text_colour, shadow_colour, video_fade, audio_fade, crop_vid, crop_aud):
    # print("Starting render", vid_id, "with ", words_loc, video_loc, audio_loc, text_offset, vid_start, audio_start, font, fontsize, video_speed, audio_speed, shadow_visible, text_colour, shadow_colour, fade_in, fade_out, crop_vid, crop_aud)
    font = 'Montserrat/Montserrat-SemiBold.ttf'
    words_loc = download_blob("addlyrics-content", words_loc, 'text')
    video_loc = download_blob("addlyrics-content", video_loc, 'video')
    if audio_loc is None:
        audio_loc = video_loc
    else:
        audio_loc = download_blob("addlyrics-content", audio_loc, 'audio')

    output_name = "/tmp/Video_" + str(vid_id) + ".mp4"

    with open(words_loc, newline='') as csvfile:
        data = list(csv.reader(csvfile))

    in_file = ffmpeg.input(video_loc)

    probe = ffmpeg.probe(video_loc)
    video_streams = [stream for stream in probe["streams"] if stream["codec_type"] == "video"]
    video_duration = (float(video_streams[0]['duration']) - vid_start) / video_speed
    video_width = video_streams[0]['width']
    video_height = video_streams[0]['height']
    bitrate = eval(video_streams[0]['bit_rate'])
    framerate = eval(video_streams[0]['r_frame_rate'])

    if video_width * video_height > 1920 * 1080:
        return "Too many pixels"

    # Make audio
    if audio_loc is None:
        audio_streams = [stream for stream in probe["streams"] if stream["codec_type"] == "audio"]
        audio_duration = audio_streams[0]['duration']

        audio_comp = in_file.audio
    else:
        print(audio_loc)
        probe = ffmpeg.probe(audio_loc)
        audio_streams = [stream for stream in probe["streams"] if stream["codec_type"] == "audio"]
        audio_duration = (float(audio_streams[0]['duration']) - audio_start) / audio_speed

        audio_comp = ffmpeg.input(audio_loc).audio

    # Edit audio
    if audio_start > 0:
        audio_comp = audio_comp.filter("atrim", start=audio_start).filter("asetpts", "PTS-STARTPTS")

    if audio_speed != 1:
        audio_comp = audio_comp.filter("atempo", audio_speed)

    if crop_aud:
        audio_comp = audio_comp.filter("atrim", start=0, end=video_duration)

    audio_fade_in, audio_fade_out = audio_fade
    if audio_fade_in > 0:
        audio_comp = audio_comp.filter("afade", type="in", start_time=0, duration=audio_fade_in)

    if audio_fade_out > 0:
        audio_comp = audio_comp.filter("afade", type="out", start_time=video_duration-audio_fade_out, duration=audio_fade_out)

    # Set-up video
    video_comp = in_file.video

    if framerate > 30:
        video_comp = video_comp.filter("fps", min(30, framerate/2))
        framerate = min(30, framerate/2)

    if video_speed != 1:
        video_comp = video_comp.filter("setpts", str(1/video_speed) + "*PTS")

    if vid_start > 0:
        video_comp = video_comp.trim(start=vid_start).setpts("PTS-STARTPTS")

    if crop_vid:
        video_comp = video_comp.trim(start=0, end=audio_duration)

    video_fade_in, video_fade_out = video_fade
    if video_fade_in > 0:
        video_comp = video_comp.filter("fade", type="in", start_time=0, duration=video_fade_in)

    if video_fade_out > 0:
        video_comp = video_comp.filter("fade", type="out", start_time=video_duration-video_fade_out, duration=video_fade_out)

    # Create filters for text
    if shadow_visible:
        shadow_offset = 5
    else:
        shadow_offset = 0

    FADE_DURATION = 0.125
    for i, line in enumerate(data):
        start_text = float(line[1])

        if len(line) == 3:
            end_text = float(line[2])
        else:
            end_text = data[i+1][1]

        lines = wraptext(font, fontsize, line[0], video_width * 0.9)

        for i, txt in enumerate(lines):
            video_comp = video_comp.drawtext(fontfile=font, text=txt, fontcolor=text_colour, shadowcolor=shadow_colour, fontsize=fontsize, shadowx=shadow_offset, shadowy=shadow_offset, x='((w-text_w)/2)+' + str(text_offset[0]), y='(h-text_h)/2+' + str(text_offset[1]) + "+" + str(i*1.25) + "*line_h", alpha='if(lt(t,' + str(start_text) +'),0,if(lt(t,' + str(start_text + FADE_DURATION) + '),(t-' + str(start_text) + ')/' + str(FADE_DURATION) +',if(lt(t,' + str(start_text + FADE_DURATION + (end_text - start_text)) + '),1,if(lt(t,' + str(start_text + FADE_DURATION * 2 + (end_text - start_text)) + '),(' + str(FADE_DURATION) + '-(t-' + str(start_text + FADE_DURATION + (end_text - start_text)) + '))/' + str(FADE_DURATION) + ',0))))')

    print("Running", output_name)

    video_comp = video_comp
    # composition = ffmpeg.output(audio_comp, video_comp, output_name, preset="veryfast", crf="28").overwrite_output() # CRF 33 also looks alright
    composition = ffmpeg.output(audio_comp, video_comp, output_name, preset="veryfast", video_bitrate=min(bitrate, 3000000), loglevel="info").global_args("-nostats").overwrite_output()
    print(composition.get_args())

    composition.run()
    print(output_name)
    upload_blob("addlyrics-content", output_name, "Video_" + str(vid_id) + ".mp4")
    return "Video_" + str(vid_id) + ".mp4"
