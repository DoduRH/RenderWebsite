import ffmpeg
from PIL import ImageFont
from uuid import uuid4
from re import compile as re_comp


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


def generate_img(text, text_colour, view_shadow, shadow_colour, fontsize, text_position, max_width, dim):
    font = 'Montserrat/Montserrat-SemiBold.ttf'
    filename = "/tmp/img_" + str(uuid4()) + ".jpg"

    if dim[0] > 1920 or dim[1] > 1080:
        return "ERROR: Image dimensions too large"  # could put error pic, video dimentions too big

    lines, height = wraptext(font, fontsize, text, dim[0] * max_width)
    text_offset = position(text_position, height)
    if view_shadow:
        shadow_offset = 5
    else:
        shadow_offset = 0

    render = (
        ffmpeg
        .input("images/testImage.jpg")
        .crop(x=0, y=0, width=dim[0], height=dim[1])
    )
    for i, txt in enumerate(lines):
        render = render.drawtext(fontfile=font, text=txt, fontcolor=text_colour, 
            shadowcolor=shadow_colour, fontsize=fontsize, shadowx=shadow_offset, 
            shadowy=shadow_offset, x=text_offset.getXPos(), y=text_offset.getYPos(i, len(lines)))
    (
        render
        .output(filename, loglevel="warning")
        .global_args("-nostats")
        .overwrite_output()
        .run()
    )

    return filename
