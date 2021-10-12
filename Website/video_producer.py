import ffmpeg
from PIL import ImageFont, Image
from re import compile as re_comp
import math
from mimetypes import guess_type

class Position():
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



def wraptext(font, fontsize, text, width):
    f = ImageFont.truetype(font, size=int(fontsize))
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
    words = args.get("words_array")
    video_filename = args.get("video_filenames",[None])[0]
    audio_filename = args.get("audio_filenames",[None])[0]
    background_colour = args.get("background_colour")
    text_position = args.get("text_position")
    text_width = float(args.get("text_width", 90))
    video_usable = [float(args.get('video_start', 0)), float(args.get('video_end', 0))]
    audio_usable = [float(args.get('audio_start', 0)), float(args.get('audio_end', 0))]
    fontsize = int(args.get("font_size", 60))
    video_speed = float(args.get("video_speed", 1))
    audio_speed = float(args.get("audio_speed", 1))
    shadow_visible = args.get("visibleShadow") == 'on'
    shadow_offset = [int(args.get("shadow_offset_x", 0)), int(args.get("shadow_offset_y", 0))]
    text_colour = args.get("textColour")
    shadow_colour = args.get("shadowColour")
    video_fade = (float(args.get("video_fade_in", 0)), float(args.get("video_fade_out", 0)))
    audio_fade = (float(args.get("audio_fade_in", 0)), float(args.get("audio_fade_out", 0)))
    crop_video = args.get("crop_video") == "on"
    crop_audio = args.get("crop_audio") == "on" if audio_filename is not None else True
    crop_image = [
        int(args.get('videoTop', 0)),
        int(args.get('videoLeft', 0)),
        int(args.get('videoBottom', 1080)),
        int(args.get('videoRight', 1920)),
    ]
    #crop_image = args.get("crop_image", [0, 0, 0, 0])

    video_stream_duration = float(args.get("video_stream_duration", 0))
    audio_stream_duration = float(args.get("audio_stream_duration", 0))
    video_dimentions = args.get("video_dimentions", dict(width=1920, height=1080))

    font = 'Montserrat/Montserrat-SemiBold.ttf'
    font = "/arial.ttf"
    if words is None:
        data = [["", 0, 0]]
    else:
        data = words

    solid_background = (video_filename == "")
    if not solid_background:
        # video_url, video_size_in = get_blob_url("addlyrics-content", video_loc, True)
        visual_type = guess_type(video_filename)[0]
    else:
        video_size_in = 0
        visual_type = "image"
        # video_url = generate_solid_background(video_id, background_colour)

    # if audio_loc is None:
    #     if "video" not in visual_type:
    #         return ("error", "no audio stream present")
    #     audio_url = video_url # THIS SHOULD NOT BE NEEDED #
    #     audio_size_in = 0
    # else:
    #     audio_url, audio_size_in = get_blob_url("addlyrics-content", audio_loc, True)

    output_name = "output.mp4"

    #video_probe = ffmpeg.probe(video_url)
    #video_streams = [stream for stream in video_probe["streams"] if stream["codec_type"] == "video"]
    #if len(video_streams) == 0:
    #    return ("error", "no video stream detected")

    if "video" in visual_type:
        in_file = ffmpeg.input(video_filename)

        video_comp = in_file.video

        # Calculate video duration
        if video_usable[1] <= video_usable[0]:
            video_usable[1] = video_stream_duration
        else:
            video_usable[1] = min(video_usable[1], video_stream_duration)

        output_video_duration = (video_usable[1] - video_usable[0]) / video_speed
    else:  # This means the visuals are coming from an image
        framerate = 30
        bitrate = 1000000  # 1kb/s Must be set so min can be taken on the output, could be lowered due to solid backdrop?
        video_comp = (
            ffmpeg
            .input(video_filename, loop=1)
            .filter('framerate', fps=framerate)
        )

    if solid_background:
        g = gcd(video_dimentions.get('width', 1920), video_dimentions.get('height', 1080))
        a = video_dimentions.get('width', 1920)/g
        b = video_dimentions.get('height', 1080)/g
        video_comp = (
            video_comp
            .filter('scale', w=video_dimentions.get('width', 1920), h=video_dimentions.get('height', 1080))
            .filter('setdar', f'{a}/{b}')
        )

    # Make audio
    if audio_filename is None:
        audio_comp = in_file.audio
    else:
        audio_comp = (
            ffmpeg
            .input(audio_filename)
            .audio
        )

    if audio_usable[1] <= audio_usable[0]:
        audio_usable[1] = audio_stream_duration
    else:
        audio_usable[1] = min(audio_usable[1], audio_stream_duration)

    audio_duration = (audio_usable[1] - audio_usable[0]) / audio_speed

    if "image" in visual_type:
        duration = output_video_duration = audio_duration
        video_stream_duration = audio_stream_duration
        video_usable[1] = duration
    else:
        if crop_video and crop_audio:
            duration = min(output_video_duration, audio_duration)
        elif crop_video:
            duration = audio_duration
        elif crop_audio:
            duration = output_video_duration
        else:
            duration = max(output_video_duration, audio_duration)

    if video_stream_duration < video_usable[0] or video_stream_duration < video_usable[1] or output_video_duration < video_fade[0] or output_video_duration < video_fade[1]:
        return {
            "success": False,
            "result": "Video timings don't match",
        }

    if audio_stream_duration < audio_usable[0] or audio_stream_duration < audio_usable[1] or audio_duration < audio_fade[0] or audio_duration < audio_fade[1]:
        return {
            "success": False,
            "result": "Audio timings don't match",
        }

    max_lines = 0
    text_h = 0
    for i, line in enumerate(data):
        lines, height = wraptext(font, fontsize, line[0], video_dimentions.get('width', 1920) * text_width)
        text_h = max(text_h, height)
        data[i].append(lines)
        max_lines = max(max_lines, len(lines))

    text_offset = Position(text_position, text_h)

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
        audio_comp = audio_comp.filter("atrim", start=0, end=output_video_duration)

    audio_fade_in, audio_fade_out = audio_fade
    if audio_fade_in > 0:
        audio_comp = audio_comp.filter("afade", type="in", start_time=0, duration=audio_fade_in)

    if audio_fade_out > 0:
        audio_comp = audio_comp.filter("afade", type="out", start_time=output_video_duration-audio_fade_out, duration=audio_fade_out)

    # Set-up video
    if crop_image != [0, 0, video_dimentions.get('width', 1920), video_dimentions.get('height', 1920)] and abs(crop_image[2]) <= video_dimentions.get('width', 1920) and abs(crop_image[3]) <= video_dimentions.get('height', 1920) and crop_image != [0, 0, 0, 0]:
        video_width = abs(crop_image[2] - crop_image[0])
        video_height = abs(crop_image[3] - crop_image[1])
        ratio = aspect(video_width, video_height)
        video_comp = (
            video_comp
            .crop(x=crop_image[0], y=crop_image[1], width=video_width, height=video_height)
            .filter('setdar', str(ratio[0]) + '/' + str(ratio[1]))
        )

    if video_usable[0] > 0 or video_usable[1] < video_usable[0] + output_video_duration:
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
    if not math.isclose(output_video_duration, duration, abs_tol=0.5) and output_video_duration < duration and not solid_background:
        ratio = aspect(video_width, video_height)
        black_video = (
            ffmpeg            
            .input("!screen-black.mp4")
            .filter('framerate', fps=framerate)
            .trim(start=0, end=duration - output_video_duration)
            .filter('scale', w=video_width, h=video_height)
            .filter('setdar', str(ratio[0]) + '/' + str(ratio[1]))
        )
        ffmpeg.run
        video_comp = (
            ffmpeg
            .concat(
                video_comp,
                black_video
            )
        )
    # VIDEO END

    # Create filters for text
    if not shadow_visible:
        shadow_offset = [0, 0]

    FADE_DURATION = 0.125
    if words is not None:
        for i, line in enumerate(data):
            start_text = float(line[1])
            end_text = float(line[2])

            for i, txt in enumerate(line[3]):
                video_comp = video_comp.drawtext(fontfile=font, text=txt, 
                fontcolor=text_colour, shadowcolor=shadow_colour, fontsize=fontsize, 
                shadowx=shadow_offset[0], shadowy=shadow_offset[1], x=text_offset.getXPos(), 
                y=text_offset.getYPos(i, len(line[3])), 
                alpha=f'if(lt(t,{start_text}),0,if(lt(t,{start_text + FADE_DURATION}),(t-{start_text})/{FADE_DURATION},if(lt(t,' + 
                f'{start_text + FADE_DURATION + (end_text - start_text)}),1,if(lt(t,{start_text + FADE_DURATION * 2 + (end_text - start_text)}' + 
                f'),({FADE_DURATION}-(t-{start_text + FADE_DURATION + (end_text - start_text)}))/{FADE_DURATION},0))))')

    video_fade_in, video_fade_out = video_fade
    if video_fade_in > 0:
        video_comp = video_comp.filter("fade", type="in", start_time=0, duration=video_fade_in)

    if video_fade_out > 0:
        video_comp = video_comp.filter("fade", type="out", start_time=duration-video_fade_out, duration=video_fade_out)

    #if do_audio_filters:
    streams = [audio_comp, video_comp]
    # else:
    #     streams = [video_comp]

    composition = (
        ffmpeg
        .output(*streams, output_name, t=duration, bitrate=3_000_000)
        .overwrite_output()
    )
    
    output_args = []
    import re
    for arg in composition.compile()[1:]:
        output_args.append(re.subn(r'\]drawtext=(.*?)\[', ']drawtext=\g<1>[', arg)[0])
        #output_args.append(arg)
    #composition.run()

    return [{
        "success": True,
        "result": output_args,
    }, output_video_duration]
