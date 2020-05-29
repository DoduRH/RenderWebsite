import csv
import ffmpeg
from google.cloud import storage
from PIL import ImageFont
import os
from magic import Magic 

m = Magic(mime=True)

class position():
    def __init__(self, pos, text_h, line_gap=1.25, edging=0.025):
        self.pos = pos.lower()
        self.text_h = text_h
        self.spacing = line_gap * text_h
        self.edging = edging

        if self.pos[1] == "l":
            self.x = 'w*' + str(self.edging)
        elif self.pos[1] == "m":
            self.x = '(w-text_w)/2'
        elif self.pos[1] == "r":
            self.x = 'w*' + str(1 - self.edging) + '-text_w'
        else:
            self.x = 0

    def getYPos(self, i, length):
        position = self.pos
        if position[0] == "t":
            y = 'h*' + str(self.edging) + '+' + str(self.spacing * i)
        elif position[0] == "m":
            y = 'h/2+' + str(self.spacing * (i - length/2))
        elif position[0] == "b":
            y = 'h*' + str(1 - self.edging) + '+' + str(-self.text_h + self.spacing * (-length + i + 1))
        else:
            y = 0
        return y

    def getXPos(self):
        return self.x


def download_blob(bucket_name, source_blob_name, filetype, giveType=False):
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
    valid = False
    for f in filetype:
        if f in mimetype:
            valid = True

    if fname not in mimetype and not valid:
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
    if giveType:
        return destination_file_name, mimetype
    else:
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
    height = 0
    for i, word in enumerate(text.split(" ")):
        tmpline = line + " " + word
        size = f.getsize(tmpline)
        height = max(size[1], height)
        if size[0] < width:
            line = tmpline
        else:
            lines.append(line.strip())
            line = word
    lines.append(line)
    return lines, height

# Take timed_words.csv of time stamped lines and put onto video.mp4
def render(video_id, words_loc, video_loc, audio_loc, text_position, text_width, video_usable, audio_usable, font, fontsize, video_speed, audio_speed, shadow_visible, text_colour, shadow_colour, video_fade, audio_fade, crop_video, crop_audio):
    # print("Starting render", video_id, "with ", words_loc, video_loc, audio_loc, text_offset, video_usable, audio_usable, font, fontsize, video_speed, audio_speed, shadow_visible, text_colour, shadow_colour, fade_in, fade_out, crop_video, crop_audio)
    font = 'Montserrat/Montserrat-SemiBold.ttf'
    if words_loc != "":
        words_loc = download_blob("addlyrics-content", words_loc, ('text'))
        with open(words_loc, newline='') as csvfile:
            data = list(csv.reader(csvfile))
    else:
        data = [["", 0, 0]]

    video_loc, visual_type = download_blob("addlyrics-content", video_loc, ('video', 'image'), True)
    if audio_loc is None:
        if "image" in visual_type:
            return "ERROR: image doesn't contain audio stream" 
        audio_loc = video_loc
    else:
        audio_loc = download_blob("addlyrics-content", audio_loc, ('audio'))

    output_name = "/tmp/VideoOutput_" + str(video_id) + ".mp4"

    video_probe = ffmpeg.probe(video_loc)
    video_streams = [stream for stream in video_probe["streams"] if stream["codec_type"] == "video"]
    if "video" in visual_type:
        in_file = ffmpeg.input(video_loc)
        bitrate = eval(video_streams[0]['bit_rate'])
        framerate = eval(video_streams[0]['r_frame_rate'])
        video_comp = in_file.video

        # Calculate video duration
        video_stream_duration = float(video_streams[0]['duration'])
        if video_usable[1] <= video_usable[0]:
            video_usable[1] = video_stream_duration
        else:
            video_usable[1] = min(video_usable[1], video_stream_duration)

        video_duration = (video_usable[1] - video_usable[0]) / video_speed
    else:  # This means the visuals are coming from an image
        framerate = 25
        bitrate = 10000000  # Must be set so min can be taken on the output, could be lowered due to solid backdrop?
        video_comp = (
            ffmpeg
            .input(video_loc, loop=True)
            .filter('framerate', fps=framerate)
        )
    
    video_width = video_streams[0]['width']
    video_height = video_streams[0]['height']

    if video_width * video_height > 1920 * 1080:
        return "Too many pixels"

    # Make audio
    if audio_loc is None:
        audio_probe = video_probe
        audio_comp = in_file.audio
    else:
        audio_probe = ffmpeg.probe(audio_loc)
        audio_comp = (
            ffmpeg
            .input(audio_loc)
            .audio
        )


    audio_streams = [stream for stream in audio_probe["streams"] if stream["codec_type"] == "audio"]
    audio_stream_duration = float(audio_streams[0]['duration'])
    if audio_usable[1] <= audio_usable[0]:
        audio_usable[1] = audio_stream_duration
    else:
        audio_usable[1] = min(audio_usable[1], audio_stream_duration)

    audio_duration = (audio_usable[1] - audio_usable[0]) / audio_speed

    if "image" in visual_type:
        duration = video_duration = audio_duration
    else:
        if crop_video and crop_audio:
            duration = min(video_duration, audio_duration)
        elif crop_video:
            duration = audio_duration
        elif crop_audio:
            duration = video_duration
        else:
            duration = max(video_duration, audio_duration)

    if duration > 300:
        valid = False
        return "ERROR Max video length 5 minutes (after applying speed change)"

    max_lines = 0
    text_h = 0
    for i, line in enumerate(data):
        lines, height = wraptext(font, fontsize, line[0], video_width * text_width)
        text_h = max(text_h, height)
        data[i].append(lines)
        max_lines = max(max_lines, len(lines))

    text_offset = position(text_position, text_h)

    # Edit audio
    if audio_usable[0] > 0 or audio_usable[1] < audio_stream_duration:
        audio_comp = (
            audio_comp
            .filter("atrim", start=audio_usable[0], end=audio_usable[1])
            .filter("asetpts", "PTS-STARTPTS")
        )

    if audio_speed != 1:
        audio_comp = audio_comp.filter("atempo", audio_speed)

    if crop_audio:
        audio_comp = audio_comp.filter("atrim", start=0, end=video_duration)

    audio_fade_in, audio_fade_out = audio_fade
    if audio_fade_in > 0:
        audio_comp = audio_comp.filter("afade", type="in", start_time=0, duration=audio_fade_in)

    if audio_fade_out > 0:
        audio_comp = audio_comp.filter("afade", type="out", start_time=video_duration-audio_fade_out, duration=audio_fade_out)

    # Set-up video
    if framerate > 30:  # reduce the framerate
        round_frame = round(framerate)
        new_rate = 0
        for i in range(30, 24, -1):  # 30 to 25
            if round_frame % i == 0:
                new_rate = i
                break
        
        framerate = max(25, new_rate)
        video_comp = video_comp.filter("fps", framerate)

    if video_speed != 1:
        video_comp = video_comp.filter("setpts", str(1/video_speed) + "*PTS")

    if video_usable[0] > 0 or video_usable[1] < video_usable[0] + video_duration:
        video_comp = (
            video_comp
            .trim(start=video_usable[0], end=video_usable[1])
            .setpts("PTS-STARTPTS")
        )

    if crop_video:
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
        end_text = float(line[2])

        for i, txt in enumerate(line[3]):
            video_comp = video_comp.drawtext(fontfile=font, text=txt, 
            fontcolor=text_colour, shadowcolor=shadow_colour, fontsize=fontsize, 
            shadowx=shadow_offset, shadowy=shadow_offset, x=text_offset.getXPos(), 
            y=text_offset.getYPos(i, len(line[3])), 
            alpha='if(lt(t,' + str(start_text) +'),0,if(lt(t,' + 
            str(start_text + FADE_DURATION) + '),(t-' + str(start_text) + ')/' + 
            str(FADE_DURATION) +',if(lt(t,' + str(start_text + FADE_DURATION + 
            (end_text - start_text)) + '),1,if(lt(t,' + 
            str(start_text + FADE_DURATION * 2 + (end_text - start_text)) + 
            '),(' + str(FADE_DURATION) + '-(t-' + str(start_text + FADE_DURATION + 
            (end_text - start_text)) + '))/' + str(FADE_DURATION) + ',0))))')
    print("Running", output_name)

    video_comp = video_comp
    # composition = ffmpeg.output(audio_comp, video_comp, output_name, preset="veryfast", crf="28").overwrite_output() # CRF 33 also looks alright
    composition = (
        ffmpeg
        .output(audio_comp, video_comp, output_name, preset="veryfast", t=duration, video_bitrate=min(bitrate, 3000000), loglevel="info")
        .global_args("-nostats")
        .overwrite_output()
    )
    print(composition.get_args())

    composition.run()
    upload_blob("addlyrics-content", output_name, "VideoOutput_" + str(video_id) + ".mp4")
    
    os.remove(output_name)
    os.remove(video_loc)
    os.remove(words_loc)
    if video_loc != audio_loc:
        os.remove(audio_loc)

    return "VideoOutput_" + str(video_id) + ".mp4"
