import ffmpeg
from PIL import ImageFont
from uuid import uuid4


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


def generate_img(text_colour, view_shadow, shadow_colour, fontsize, text_offset, dim):
    text = "Add my lyrics"
    font = 'Montserrat/Montserrat-SemiBold.ttf'
    filename = "/tmp/img_" + str(uuid4()) + ".jpg"

    if dim[0] * dim[1] > 1920 * 1080:
        return "Error"  # could put error pic, video dimentions too big

    lines = wraptext(font, fontsize, text, dim[0] * 0.9)
    if view_shadow:
        shadow_offset = 5
    else:
        shadow_offset = 0

    render = (
        ffmpeg
        .input("images/testImage.jpg")
        .crop(x=(1920-dim[0])/2 ,y=(1080-dim[1])/2 , width=dim[0], height=dim[1])
    )
    for i, txt in enumerate(lines):
        render = render.drawtext(fontfile=font, text=txt, fontcolor=text_colour, shadowcolor=shadow_colour, fontsize=fontsize, shadowx=shadow_offset, shadowy=shadow_offset, x='((w-text_w)/2)+' + str(text_offset[0]), y='(h-text_h)/2+' + str(text_offset[1]) + "+" + str(i*1.25) + "*line_h")
    (
        render
        .output(filename, loglevel="warning")
        .global_args("-nostats")
        .overwrite_output()
        .run()
    )

    return filename
