import os, sys
import time
import timeit
import subprocess
sys.path.append(os.path.abspath(os.curdir))

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "addlyrics-ed88c47e7d9d.json"

from video_producer import render

true = True
false = False
null = None

csv_file = "csv_7dcfcbec-6975-4a42-badd-abff2194272e.csv"
video_file = "VideoOutput_7dcfcbec-6975-4a42-badd-abff2194272e.mp4"
audio_file = "audio_7dcfcbec-6975-4a42-badd-abff2194272e.mp3"

args = [
    ('visualType', 'video'),
    ('background_colour', '#000000'),
    ('video_start', '0'),
    ('video_end', '0'),
    ('video_speed', '1'),
    ('video_fade_in', '5'),
    ('video_fade_out', '5'),
    ('crop_video', 'on'),
    ('crop_audio', 'on'),
    ('audioSource', 'audio'),
    ('audio_start', '0'),
    ('audio_end', '180'),
    ('audio_speed', '1'),
    ('audio_fade_in', '5'),
    ('audio_fade_out', '5'),
    ('font_size', '45'),
    ('text_colour', '#ffffff'),
    ('view_shadow', 'on'),
    ('shadow_colour', '#000000'),
    ('shadow_offset', [3, 3]),
    ('text_position', 'tm'),
    ('text_width', '90'),
    ('videoExt', 'mp4'),
    ('audioExt', 'mp3'),
    ('uuid', 'a99b7c42-c05d-4afe-9a8d-b3b09d8533bf'),
    ('video_usable', [10, 70]),
    ('audio_usable', [10, 70]),
    ('video_duration', 80),
    ('audio_duration', 70),
    ('video_dimentions', dict(width=1920, height=1080)),
    ('video_fade', [5, 5]),
    ('audio_fade', [5, 5]),

]

renderDictionary = {}

for k, v in args:
    try:
        p = float(v)
    except:
        p = v
    renderDictionary[k] = p

renderDictionary['words'] = [
    #["a b", "1", "5"]
    ["Who has held the oceans in His hands?|Who has numbered every grain of sand?|Kings and nations tremble at His voice|All creation rises to rejoice","1.0","28.81"],
    ["Behold our God seated on His throne|Come, let us adore Him|Behold our King! Nothing can compare|Come, let us adore Him!","28.81","56.71"],
    
    #["Who has given counsel to the Lord?|Who can question any of His words?|Who can teach the One Who knows all things?|Who can fathom all His wondrous deeds?","67.03","92.15"],
    #["Behold our God seated on His throne|Come, let us adore Him|Behold our King! Nothing can compare|Come, let us adore Him!","92.15","121.61"],
    #["Who has felt the nails upon His hands|Bearing all the guilt of sinful man?|God eternal humbled to the grave|Jesus, Savior risen now to reign!","126.96","151.17"],
    #["Behold our God seated on His throne|Come, let us adore Him|Behold our King! Nothing can compare|Come, let us adore Him!","151.17","182.69"],
    #["You will reign forever|(Let Your glory fill the earth)|[x4]","182.69","207.58"],
    #["Behold our God seated on His throne|Come, let us adore Him|Behold our King! Nothing can compare|Come, let us adore Him!","207.58","236.43"],
]
renderDictionary['video_name'] = "input_video.mp4"
#renderDictionary['audio_file'] = "audio_" + renderDictionary['uuid'] + "." + renderDictionary['audioExt']
renderDictionary['audio_name'] = None

start = time.time()
command = f"ffmpeg {' '.join(render(renderDictionary))}"
print(command, end="\n\n")

with open("output.txt", "w+") as f:
    f.write(command)

subprocess.call(command)
# render(renderDictionary['uuid'], renderDictionary['csv_file'], renderDictionary['video_file'], renderDictionary['audio_file'], renderDictionary['background_colour'], renderDictionary['text_position'], int(renderDictionary['text_width'])/100, [int(renderDictionary['video_start']), int(renderDictionary['video_end'])], [int(renderDictionary['audio_start']), int(renderDictionary['audio_end'])], "Arial-Bold", int(renderDictionary['font_size']), float(renderDictionary['video_speed']), float(renderDictionary['audio_speed']), 'visibleShadow' in renderDictionary.keys(), (int(renderDictionary['shadow_offset_x']), int(renderDictionary['shadow_offset_x'])), renderDictionary['textColour'], renderDictionary['shadowColour'], (int(renderDictionary['video_fade_in']), int(renderDictionary['video_fade_out'])), (int(renderDictionary['audio_fade_in']), int(renderDictionary['audio_fade_out'])), 'crop_video' in renderDictionary.keys(),  'crop_audio' in renderDictionary.keys())
# render("e62368b8-7f4a-496f-bc7b-ab124207a65c", "csv_e62368b8-7f4a-496f-bc7b-ab124207a65c.csv", "", "audio_e62368b8-7f4a-496f-bc7b-ab124207a65c.mp3", "#878787", "mm", 0.9, [0.0, 0.0], [30.0, 260.0], "Arial-Bold", 100, 1.0, 1.0, false, [5, 5], "#ffffff", "#000000", [5.0, 5.0], [5.0, 5.0], true, false)
#video_id, words_loc, video_loc, audio_loc, background_colour, text_position, text_width, video_usable, audio_usable, font, fontsize, video_speed, audio_speed, shadow_visible, shadow_offset, text_colour, shadow_colour, video_fade, audio_fade, crop_video, crop_audio
print(time.time() - start)
