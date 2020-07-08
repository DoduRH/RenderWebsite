import ffmpeg
from PIL import ImageFont, Image
from uuid import uuid4
from re import compile as re_comp
from os import remove
import base64


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


def save_image(imageData, name):
    with open(name, "wb") as fh:
        fh.write(base64.decodebytes(imageData.split(",")[1].encode()))
    
    return name


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

def generate_img(text, text_colour, view_shadow, background_type, background_colour, shadow_colour, shadow_offset, fontsize, text_position, max_width, image, crop_image):
    font = 'Montserrat/Montserrat-SemiBold.ttf'
    preview_id = str(uuid4())
    filename = "/tmp/img_" + preview_id + ".jpg"

    if background_type == "solid":
        imagename = generate_solid_background(preview_id, background_colour)
        dim = (1920, 1080)
    else:
        imagename = "/tmp/og_img_" + preview_id + ".png"
        imagename = save_image(image, imagename)

        image_probe = ffmpeg.probe(imagename)
        image_streams = [stream for stream in image_probe["streams"] if stream["codec_type"] == "video"]
        dim = [image_streams[0]['width'], image_streams[0]['height']]

    if dim[0] * dim[1] > 1080 * 1920:
        return "ERROR: Image dimensions too large"  # could put error pic, video dimentions too big

    if not view_shadow:
        shadow_offset = [0, 0]

    render = ffmpeg.input(imagename)

    if crop_image != [0, 0, dim[0], dim[1]] and crop_image != [0, 0, 0, 0]:
        render = render.crop(x=crop_image[0], y=crop_image[1], width=abs(crop_image[2] - crop_image[0]), height=abs(crop_image[3] - crop_image[1]))
        dim[0] = abs(crop_image[2] - crop_image[0])
        dim[1] = abs(crop_image[3] - crop_image[1])

    lines, height = wraptext(font, fontsize, text, dim[0] * max_width)
    text_offset = position(text_position, height)

    if background_type == "solid":
        render = render.filter('scale', w=1920, h=1080)

    for i, txt in enumerate(lines):
        render = render.drawtext(fontfile=font, text=txt, fontcolor=text_colour, 
            shadowcolor=shadow_colour, fontsize=fontsize, shadowx=shadow_offset[0], 
            shadowy=shadow_offset[1], x=text_offset.getXPos(), y=text_offset.getYPos(i, len(lines)))
    (
        render
        .output(filename, loglevel="warning")
        .global_args("-nostats")
        .overwrite_output()
        .run()
    )

    print("Deleting", imagename, end=" - ")
    remove(imagename)
    print("Done")

    return filename
