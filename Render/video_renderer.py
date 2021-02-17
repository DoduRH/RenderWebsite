import csv
import ffmpeg
from google.cloud import storage
from PIL import ImageFont, Image
import os
from magic import Magic 
from re import compile as re_comp
from re import split as reg_split
from time import sleep
import sqlConnector
import math
from datetime import timedelta
from mimetypes import guess_type
from numexpr import evaluate

m = Magic(mime=True)

def simple_comp_compile(comp, urls):
    compile = " ".join(comp.compile())
    for i, url in enumerate(urls):
        compile = compile.replace(url, "video_input_" + str(i) + ".mp4")
    
    return compile

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


def aspect(a, b):
    a = round(a)
    b = round(b)
    divide = gcd(a, b)
    return int(a/divide), int(b/divide)


def gcd(a, b):
    large = max(a, b)
    small = min(a, b)
    rem = large % small
    while rem != 0:
        large = small
        small = rem
        rem = large % small
    return small


def download_blob(bucket_name, source_blob_name, filetype, giveType=False):
    """Downloads a blob from the bucket."""
    # bucket_name = "your-bucket-name"
    # source_blob_name = "storage-object-name"
    # destination_file_name = "local/path/to/file"

    storage_client = storage.Client()

    destination_file_name = "/tmp/" + source_blob_name

    print(
        "Downloading blob {} to {} - ".format(
            source_blob_name, destination_file_name
        ),
        end=""
    )

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name)
    
    return destination_file_name


def get_blob_url(bucket_name, source_blob_name, return_size=False):
    """Returns url for a blob from the bucket."""
    # bucket_name = "your-bucket-name"
    # source_blob_name = "storage-object-name"

    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.get_blob(source_blob_name)

    url = blob.generate_signed_url(
            expiration=timedelta(minutes=60),
            method='GET', version="v4")
    
    if return_size:
        return [url, blob.size]
    else:
        return url


def upload_blob(bucket_name, source_file_name, destination_blob_name):
    """Uploads a file to the bucket."""
    # bucket_name = "your-bucket-name"
    # source_file_name = "local/path/to/file"
    # destination_blob_name = "storage-object-name"

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    print(
        "Uploading file {} to {} - ".format(
            source_file_name, destination_blob_name
        ),
        end=""
    )

    blob.upload_from_filename(source_file_name)

    print("Success")


def reverse_readline(filename, buf_size=8192):
    """A generator that returns the lines of a file in reverse order"""
    with open(filename) as fh:
        segment = None
        offset = 0
        fh.seek(0, os.SEEK_END)
        file_size = remaining_size = fh.tell()
        while remaining_size > 0:
            offset = min(file_size, offset + buf_size)
            fh.seek(file_size - offset)
            buffer = fh.read(min(remaining_size, buf_size))
            remaining_size -= buf_size
            lines = buffer.split('\n')
            # The first line of the buffer is probably not a complete line so
            # we'll save it and append it to the last line of the next buffer
            # we read
            if segment is not None:
                # If the previous chunk starts right from the beginning of line
                # do not concat the segment to the last line of new chunk.
                # Instead, yield the segment first 
                if buffer[-1] != '\n':
                    lines[-1] += segment
                else:
                    yield segment
            segment = lines[0]
            for index in range(len(lines) - 1, 0, -1):
                if lines[index]:
                    yield lines[index]
        # Don't yield None if the file was empty
        if segment is not None:
            yield segment


def delete_files(files):
    filenames = []
    for f in files:
        if os.path.exists(f):
            os.remove(f)
            filenames.append(f)
    print("Deleted files: ", ", ".join(filenames))


def wraptext(font, fontsize, text, width):
    f = ImageFont.truetype(font, size=fontsize)
    lines = []
    height = 0
    splitter = re_comp(r'(?: ?)\|(?: ?)')
    for txt in splitter.split(text):
        line = ""
        for i, word in enumerate(txt.split(" ")):
            tmpline = line + " " + word
            size = f.getsize(tmpline)
            height = max(size[1], height)
            if size[0] < width:
                line = tmpline
            else:
                lines.append(line.strip())
                line = word
        lines.append(line.strip())
    return lines, height

def hex2rgb(hexcode):
    # Convert 6 char hex to tuplet RGB
    hexcode = hexcode.lower().replace("#", "")
    col = []
    for i in range(0, 6, 2):
        num = 0
        for j in range(2):
            letter = hexcode[i + j]
            if letter.isnumeric():
                num += int(letter) * (16**(1-j))
            else:
                num += (ord(letter)-87) * (16**(1-j))

        col.append(num)
    return tuple(col)

def generate_solid_background(video_id, background_colour, dim=(1, 1)):
    filename = "/tmp/solid_" + video_id + ".jpg"
    Image.new('RGB', dim, hex2rgb(background_colour)).save(filename)
    return filename

# Take timed_words.csv of time stamped lines and put onto video.mp4
def render(args):
    # Get values from the dictionary
    video_id = args.get("video_id")
    words_loc = args.get("csv_name")
    video_file_names = args.get("video_file_names")
    audio_loc = args.get("audio_name")
    background_colour = args.get("background_colour")
    text_position = args.get("text_position")
    text_width = args.get("text_width")
    video_usable = args.get("video_usable")
    audio_usable = args.get("audio_usable")
    font = args.get("font")
    fontsize = args.get("font_size")
    video_speed = args.get("video_speed")
    audio_speed = args.get("audio_speed")
    shadow_visible = args.get("view_shadow")
    shadow_offset = args.get("shadow_offset")
    text_colour = args.get("text_colour")
    shadow_colour = args.get("shadow_colour")
    video_fade = args.get("video_fade")
    audio_fade = args.get("audio_fade")
    crop_video = args.get("crop_video")
    crop_audio = args.get("crop_audio")
    crop_image = args.get("crop_image", [0, 0, 0, 0])
    output_width, output_height = args.get("output_resolution", [1280, 720])

    font = 'Montserrat/Montserrat-SemiBold.ttf'
    if words_loc != "":
        words_loc = download_blob("addlyrics-content", words_loc, ('text'))
        with open(words_loc, newline='') as csvfile:
            data = list(csv.reader(csvfile))
    else:
        data = [["", 0, 0]]

    solid_background = (video_file_names == []) # not sure this is right any more

    video_size_in = 0
    video_urls = []
    if not solid_background:
        for video_loc in video_file_names:
            url, video_size = get_blob_url("addlyrics-content", video_loc, True)
            video_size_in += video_size
            video_urls.append(url)

        visual_type = guess_type(video_loc)[0]
    else:
        video_size_in = 0
        visual_type = "image"
        video_urls = [generate_solid_background(video_id, background_colour)]

    if audio_loc is None:
        if "video" not in visual_type:
            return ("error", "no audio stream present")
        audio_size_in = 0
    else:
        audio_url, audio_size_in = get_blob_url("addlyrics-content", audio_loc, True)

    output_name = "/tmp/VideoOutput_" + video_id + ".mp4"

    video_width = 0
    video_height = 0
    bitrate = 0
    video_comp = None
    for i, url in enumerate(video_urls):
        video_probe = ffmpeg.probe(url)
        video_streams = [stream for stream in video_probe["streams"] if stream["codec_type"] == "video"]
        if len(video_streams) == 0:
            return ("error", "no video stream detected")

        if "video" in visual_type:
            video_input = video_comp = video_comp.input(url)
            if 'bit_rate' in video_streams[0].keys():
                try:
                    bitrate = max(bitrate, evaluate(video_streams[0]['bit_rate']))
                except:
                    print("bitrate unreadable", video_id)
            else:
                bitrate = 3000000

            if 'r_frame_rate' in video_streams[0].keys():
                try:
                    framerate = max(framerate, evaluate(video_streams[0]['r_frame_rate']))
                except:
                    print("bitrate unreadable", video_id)
            else:
                framerate = 25

            # Calculate video duration
            video_stream_duration = float(video_streams[0]['duration'])
            if video_usable[1] <= video_usable[0]:
                video_usable[1] = video_stream_duration
            else:
                video_usable[1] = min(video_usable[1], video_stream_duration)

            video_duration = (video_usable[1] - video_usable[0]) / video_speed
        else:  # This means the visuals are coming from an image
            framerate = 25
            bitrate = 1000000  # 1kb/s Must be set so min can be taken on the output, could be lowered due to solid backdrop?
            current_img = (
                ffmpeg
                .input("cache:" + url, stream_loop=-1, t=10)
                .filter('framerate', fps=framerate)
                .filter('scale', w=output_width, h=output_height)
            )

            if video_comp is None:
                video_comp = current_img
            else:
                video_comp = (
                    ffmpeg
                    .concat(
                        video_comp,
                        current_img
                    )
                )

        if solid_background:
            video_width = 1920
            video_height = 1080
            video_comp = (
                video_comp
                .filter('scale', w=video_width, h=video_height)
                .filter('setdar', '16/9')
            )
        else:
            video_width = video_streams[0]['width']
            video_height = video_streams[0]['height']

        if video_width * video_height > 1920 * 1080:
            return ("error", "Too many pixels")

    # Make audio
    if audio_loc is None:
        audio_probe = video_probe
        audio_comp = video_input.audio
    else:
        audio_probe = ffmpeg.probe(audio_url)
        audio_comp = (
            ffmpeg
            .input(audio_url)
            .audio
        )

    audio_streams = [stream for stream in audio_probe["streams"] if stream["codec_type"] == "audio"]
    do_audio_filters = True
    if audio_streams == []:
        audio_stream_duration = video_stream_duration
        if audio_loc == video_loc:
            do_audio_filters = False
    else:
        if "duration" in audio_streams[0].keys():
            audio_stream_duration = float(audio_streams[0]['duration'])
        elif "duration" in audio_probe['format']:
            audio_stream_duration = float(audio_probe['format']['duration'])
        else:
            return ("error", "No audio duration found")

    if audio_usable[1] <= audio_usable[0]:
        audio_usable[1] = audio_stream_duration
    else:
        audio_usable[1] = min(audio_usable[1], audio_stream_duration)

    audio_duration = (audio_usable[1] - audio_usable[0]) / audio_speed

    if "image" in visual_type:
        duration = video_duration = audio_duration
        video_stream_duration = audio_stream_duration
        video_usable[1] = duration
    else:
        if crop_video and crop_audio:
            duration = min(video_duration, audio_duration)
        elif crop_video:
            duration = audio_duration
        elif crop_audio:
            duration = video_duration
        else:
            duration = max(video_duration, audio_duration)

    if duration > 600:
        return ("error", "Max video length 5 minutes (after applying speed change)")

    if video_stream_duration < video_usable[0] or video_stream_duration < video_usable[1] or video_duration < video_fade[0] or video_duration < video_fade[1]:
        return ("error", "Video timings don't match")

    if audio_stream_duration < audio_usable[0] or audio_stream_duration < audio_usable[1] or audio_duration < audio_fade[0] or audio_duration < audio_fade[1]:
        return ("error", "Audio timings don't match")

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
    if crop_image != [0, 0, video_width, video_height] and abs(crop_image[2]) < video_width and abs(crop_image[3]) < video_height and crop_image != [0, 0, 0, 0]:
        video_width = abs(crop_image[2] - crop_image[0])
        video_height = abs(crop_image[3] - crop_image[1])
        ratio = aspect(video_width, video_height)
        video_comp = (
            video_comp
            .crop(x=crop_image[0], y=crop_image[1], width=video_width, height=video_height)
            .filter('setdar', str(ratio[0]) + '/' + str(ratio[1]))
        )

    if video_usable[0] > 0 or video_usable[1] < video_usable[0] + video_duration:
        video_comp = (
            video_comp
            .trim(start=video_usable[0], end=video_usable[1])
            .setpts("PTS-STARTPTS")
        )

    if video_speed != 1:
        video_comp = video_comp.filter("setpts", str(1/video_speed) + "*PTS")

    if crop_video:
        video_comp = video_comp.trim(start=0, end=audio_duration)

    # Add black screen to end video
    if not math.isclose(video_duration, duration, abs_tol=0.5) and video_duration < duration and not solid_background:
        filename = generate_solid_background(video_id, "#000000")
        ratio = aspect(video_width, video_height)
        black_video = (
            ffmpeg            
            .input(filename, loop=True)
            .filter('framerate', fps=framerate)
            .trim(start=0, end=duration - video_duration)
            .filter('scale', w=video_width, h=video_height)
            .filter('setdar', str(ratio[0]) + '/' + str(ratio[1]))
        )

        video_comp = (
            ffmpeg
            .concat(
                video_comp,
                black_video
            )
        )
    
    if framerate > 30:  # reduce the framerate
        round_frame = round(framerate)
        new_rate = 0
        for i in range(30, 24, -1):  # 30 to 25
            if round_frame % i == 0:
                new_rate = i
                break
        
        framerate = max(25, new_rate)
        video_comp = video_comp.filter("fps", framerate)
    # VIDEO END

    # Create filters for text
    if not shadow_visible:
        shadow_offset = [0, 0]

    word_count = 0

    FADE_DURATION = 0.125
    if words_loc != "":
        for i, line in enumerate(data):
            word_count += len(reg_split(r" |\|", line[0]))
            start_text = float(line[1])
            end_text = float(line[2])

            for i, txt in enumerate(line[3]):
                video_comp = video_comp.drawtext(fontfile=font, text=txt, 
                fontcolor=text_colour, shadowcolor=shadow_colour, fontsize=fontsize, 
                shadowx=shadow_offset[0], shadowy=shadow_offset[1], x=text_offset.getXPos(), 
                y=text_offset.getYPos(i, len(line[3])), 
                alpha='if(lt(t,' + str(start_text) +'),0,if(lt(t,' + 
                str(start_text + FADE_DURATION) + '),(t-' + str(start_text) + ')/' + 
                str(FADE_DURATION) +',if(lt(t,' + str(start_text + FADE_DURATION + 
                (end_text - start_text)) + '),1,if(lt(t,' + 
                str(start_text + FADE_DURATION * 2 + (end_text - start_text)) + 
                '),(' + str(FADE_DURATION) + '-(t-' + str(start_text + FADE_DURATION + 
                (end_text - start_text)) + '))/' + str(FADE_DURATION) + ',0))))')

    video_fade_in, video_fade_out = video_fade
    if video_fade_in > 0:
        video_comp = video_comp.filter("fade", type="in", start_time=0, duration=video_fade_in)

    if video_fade_out > 0:
        video_comp = video_comp.filter("fade", type="out", start_time=duration-video_fade_out, duration=video_fade_out)

    progress_file = "/tmp/progress_" + video_id + ".txt"
    if do_audio_filters:
        streams = [audio_comp, video_comp]
    else:
        streams = [video_comp]

    composition = (
        ffmpeg
        .output(*streams, output_name, preset="veryfast", t=duration, video_bitrate=min(bitrate, 3000000), loglevel="info", progress=progress_file)
        .overwrite_output()
        .global_args("-nostats")
    )
    # print(composition.compile())

    composition.run_async()
    sleep(5)
    # Check render has started sucsessfully
    failure = 0
    done = False
    total_frames = int(duration * framerate)

    while not done:
        sleep(2)
        if not os.path.exists(progress_file):
            failure += 1
            if failure >= 30:
                return ("error", "Render failed to initiate after 1 minute")
        
        skip = True
        latest = {'frame': 0, 'progress': "continue"}
        for r in reverse_readline(progress_file):
            if skip:
                skip = False
                latest = {'frame': 0, 'progress': r.split("=")[1]}
            else:
                if r.startswith("progress"):
                    break
                line = r.split("=")
                latest[line[0]] = line[1]

        if latest['progress'].rstrip() == "end":
            done = True
            progress = "99"
        else:
            progress = min(99, round(int(latest["frame"])*100/total_frames))

        sqlConnector.set_document(video_id, {'progress': progress}, merge=True)

    upload_blob("addlyrics-content", output_name, "VideoOutput_" + video_id + ".mp4")
    
    sqlConnector.set_document(video_id, {'progress': 100}, merge=True)
    
    # Increment counters
    video_size_out = os.path.getsize("/tmp/VideoOutput_" + video_id + ".mp4")

    sqlConnector.increment_stats(video_size_in, audio_size_in, video_size_out, duration, word_count)
    sqlConnector.set_document(video_id, {
        'video_size_in': video_size_in, 
        'audio_size_in': audio_size_in, 
        'video_size_out': video_size_out, 
        'duration': duration, 
        'word_count': word_count
    }, merge=True)

    delete_files([output_name, words_loc, progress_file])

    return ("Sucsess", "VideoOutput_" + video_id + ".mp4")
