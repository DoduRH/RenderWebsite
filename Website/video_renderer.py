from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips, TextClip, CompositeVideoClip, AudioClip
from moviepy.video.fx.all import resize
from moviepy.audio.AudioClip import CompositeAudioClip, AudioArrayClip
import math
import csv
import time
# import pysftp
import ffmpeg
import numpy as np

'''def download_file(files, direction):
    myHostname = "192.168.1.222"
    myUsername = "pi"
    myPassword = "Linux222"
    cnopts = pysftp.CnOpts()
    cnopts.hostkeys = None
    
    with pysftp.Connection(host=myHostname, username = myUsername, password =  myPassword, cnopts=cnopts) as sftp:
        print("Connection succesfully stablished ... ")

        # Switch to a remote directory
        sftp.cwd('/home/pi/Website')

        for file in files:
            if direction=="down":
                print("Getting ", file[0], "saving as", file[1])
                sftp.get(file[0], file[1])
            elif direction == "up":
                print("Putting ", file[0], "saving as", file[1])
                sftp.put(file[0], file[1]) '''


def audioFx(media, speedFactor, start_time, output_loc):
    input = ffmpeg.input(media)
    audio = input.audio.filter("atrim", start=max(0, start_time)).filter("atempo", speedFactor)
    out = ffmpeg.output(audio, filename=output_loc)
    ffmpeg.run(out)
    return output_loc

# Take timed_words.csv of time stamped lines and put onto video.mp4
def render(vid_id, words_loc, video_loc, audio_loc, text_offset, vid_start, audio_start, font, fontsize, video_speed, audio_speed, shadow_visible, text_colour, shadow_colour, fade_in, fade_out, crop_vid, crop_aud):
    print("Starting render", vid_id, "with ", words_loc, video_loc, audio_loc, text_offset, vid_start, audio_start, font, fontsize, video_speed, audio_speed, shadow_visible, text_colour, shadow_colour, fade_in, fade_out, crop_vid, crop_aud)
    start_time = time.time()

    with open(words_loc, newline='') as csvfile:
        data = list(csv.reader(csvfile))

    change_audio = False

    # Apply speed and start elements to the audio
    if audio_speed != 1 or audio_start != 0:
        change_audio = True
        if audio_loc == None:
            media = video_loc
        else:
            media = audio_loc
        
        output_loc = "content/audioNew_" + str(vid_id) + ".mp3"
        audioFx(media, audio_speed, audio_start, output_loc)
        audio_loc = output_loc

    vid = VideoFileClip(video_loc)
    vid = vid.subclip(vid_start, vid.duration)

    # If seperate audio provided
    if audio_loc != None:
        change_audio = True
        audio = AudioFileClip(audio_loc)

    # Change video speed
    if video_speed != 1:
        print("Change vid speed", video_speed)
        vid = vid.speedx(video_speed)
    
    if change_audio:
        if crop_aud:
            print("Crop audio")
            audio = audio.subclip(0, min(vid_start + vid.duration, audio.duration))
        if crop_vid:
            print("Crop video")
            vid = vid.subclip(0, audio.duration)

        # Generate and add silence if needed
        if audio.duration < vid.duration:
            print("Adding silence")
            N = int((vid.duration - audio.duration) * audio.fps)
            silence = AudioArrayClip(np.zeros((N, 2)), audio.fps).set_start(audio.duration)
            audio = CompositeAudioClip([audio, silence])
        vid = vid.set_audio(audio)

    composition_clips = [vid]

    print("Creating composition")
    for i, line in enumerate(data):
        start_text = float(line[1])

        if len(line) == 3:
            end_text = float(line[2])
        else:
            end_text = float(data[i+1][1])

        words = line[0].strip()
        txt = words.replace("| ", "\n")
        txt_clip = TextClip(txt, font=font, fontsize=fontsize, color=text_colour)

        if txt_clip.size[0] + 100 > vid.size[0]:
            txt = words.replace(", ", ",\n").replace("| ", "\n")
            txt_clip = TextClip(txt, font=font, fontsize=fontsize, color=text_colour)

        tmp = words.split(" ")
        n_lines = 2
        i = len(tmp)
        while txt_clip.size[0] + 100 > vid.size[0]:
            # txt = "\n".join([" ".join(tmp[0:-i]), " ".join(tmp[-i:])])
            tmp = words.split(" ")
            if i == 1:
                n_lines += 1
                i = math.floor(len(tmp)/(n_lines-1))
                if i == 2:
                    txt_clip = TextClip(words, font=font, fontsize=fontsize, color=text_colour)
                    break

            i -= 1
            lines = []
            for j in range(n_lines - 1):
                cur_line = []
                for k in range(i):
                    cur_line.append(tmp.pop(0))
                lines.append(" ".join(cur_line))
            lines.append(" ".join(tmp))
            txt = "\n".join(lines)
            txt_clip = TextClip(txt, font=font, fontsize=fontsize, color=text_colour)
        
        if shadow_visible:
            shd_clip = TextClip(txt, font=font, fontsize=fontsize, color=shadow_colour)
            shd_clip = shd_clip.set_duration(end_text-start_text + 0.125)
            conc_shadow = shd_clip.set_position([(vid.size[0] - txt_clip.size[0])/2 + text_offset[0] + 5, (vid.size[1] - txt_clip.size[1])/2 + text_offset[1] + 5])
            conc_shadow = conc_shadow.set_start(start_text - 0.125).crossfadeout(0.125)
            conc_shadow = conc_shadow.crossfadein(0.125)
            composition_clips.append(conc_shadow)

        # duration +.125 for fade
        txt_clip = txt_clip.set_duration(end_text-start_text + 0.125)


        # set position on screen
        conc_main = txt_clip.set_position([(vid.size[0] - txt_clip.size[0])/2 + text_offset[0], (vid.size[1] - txt_clip.size[1])/2 + text_offset[1]])
        

        # Fade
        conc_main = conc_main.set_start(start_text - 0.125).crossfadeout(0.125)
        
        conc_main = conc_main.crossfadein(0.125)
        
        composition_clips.append(conc_main)

    print("Compositing Video")
    final_clip = CompositeVideoClip(composition_clips)

    # apply start and end fade
    final_clip = final_clip.fadein(fade_in).fadeout(fade_out)
    final_clip = final_clip.resize(height=min(1080, vid.h))

    output_name = "output/Video_" + str(vid_id) + ".mp4"
    print("Saving", output_name)
    final_clip.write_videofile(output_name)
    print(time.time() - start_time)

    return output_name