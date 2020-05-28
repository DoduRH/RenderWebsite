var myVideo = document.getElementById("video1");
var myAudio = document.getElementById("audio1");
var videoUpload = document.getElementById("videoUpload");
var audioUpload = document.getElementById("audioUpload");
var videoType = document.getElementById("videoType");
var audioType = document.getElementById("audioType");

var videoStart = document.getElementById("vid_start");
var videoEnd = document.getElementById("vid_end");
var audioStart = document.getElementById("audio_start");
var audioEnd = document.getElementById("audio_end");
var write = document.getElementById("csv");
var csvHead = document.getElementById("csvHeading");
var lyrics = document.getElementById("lyricsArea");
var tbl = document.getElementById("table1");
var slider_x = document.getElementById("offset_x");
var slider_y = document.getElementById("offset_y");
var audioSpeed = document.getElementById("audio_speed");
var videoSpeed = document.getElementById("vid_speed");
var previewImg = document.getElementById("previewImg");
var lastFocus = null;
var myMedia;
var tableLength = 0;
var timerID;
var c;
var uploading;
var vid_id;

var start_times = [];
var stop_times = [];

function vidChange() {
    console.log("New video");
    var reader = new FileReader();
    reader.onload = function (e) {
        console.log("Set as source");
        myVideo.src = this.result;
        myVideo.closest('#tab').hidden = false;
        //myVideo.parentElement.hidden = false;
        changeSpeed(myVideo, videoSpeed.value);

        if (myAudio.src == "") {
            myMedia = myVideo;
        }

        videoStart.max = myVideo.duration;
        videoEnd.max = myVideo.duration;
    };
    reader.readAsDataURL(videoUpload.files[0]);
};

function audioChange() {
    console.log("New audio");
    var reader = new FileReader();
    reader.onload = function (e) {
        console.log("Set as source");
        myAudio.src = this.result;
        myAudio.closest('#tab').hidden = false;

        myMedia = myAudio;

        audioStart.max = myAudio.duration;
        audioEnd.max = myAudio.duration;
    };

    reader.readAsDataURL(audioUpload.files[0]);
};

function changeSpeed(elm, s) {
    elm.playbackRate = s;
}

audio_speed.onchange = function () {
    console.log("Changed speed of audio");
    changeSpeed(myAudio, audioSpeed.value);
};

vid_speed.onchange = function () {
    console.log("Changed speed of video");
    changeSpeed(myVideo, videoSpeed.value);
};

myVideo.onplay = (e) => {
    if (myVideo == myMedia) {
        console.log("Playing media")
        timerID = setInterval(update_highlight, 100);
    }
}

myVideo.onpause = (e) => {
    update_highlight()
    if (myVideo == myMedia) {
        console.log("Pausing media")
        clearInterval(timerID)
    }
}

myVideo.onseeking = (e) => {
    if (myVideo == myMedia) {
        console.log("Playing media")
        timerID = setInterval(update_highlight, 100);
    }
}

myVideo.onseeked = (e) => {
    if (myVideo == myMedia) {
        console.log("Pausing media")
        clearInterval(timerID)
    }
    update_highlight()
}

myAudio.onplay = (e) => {
    if (myAudio == myMedia) {
        console.log("Playing media")
        timerID = setInterval(update_highlight, 100);
    }
}

myAudio.onpause = (e) => {
    update_highlight()
    if (myAudio == myMedia) {
        console.log("Pausing media")
        clearInterval(timerID)
    }
}

myAudio.onseeking = (e) => {
    if (myAudio == myMedia) {
        console.log("Playing media")
        timerID = setInterval(update_highlight, 100);
    }
}

myAudio.onseeked = (e) => {
    update_highlight()
    if (myAudio == myMedia) {
        console.log("Pausing media")
        clearInterval(timerID)
    }
}

function media_set() {
    console.log("Media change")
    myMedia.onchange = (e) => {

    };
};

function textAreaAdjust(o) {
    o.style.width = "1px";
    o.style.width = Math.max((25 + o.scrollWidth), 253) + "px";
    o.style.height = "1px";
    o.style.height = Math.max(5 + (o.scrollHeight), 25) + "px";
}

function previewFrame() {
    previewImg.hidden = true;

    maincol = document.getElementById("textColour").value.replace("#", "")
    visible = document.getElementById("visibleShadow").checked
    shadow = document.getElementById("shadowColour").value.replace("#", "")
    size = document.getElementById("font_size").value
    offsetx = document.getElementById("offset_x").value
    offsety = document.getElementById("offset_y").value
    if (myVideo.videoWidth == 0) {
        console.log("No preview for you");
        showElementError(videoUpload, "Please upload a video")
        return
    } else {
        dimx = myVideo.videoWidth
        dimy = myVideo.videoHeight
    }

    address = '/prev' +
        '?maincol=' + maincol +
        "&visible=" + visible +
        "&shadow=" + shadow +
        '&fontsize=' + size +
        "&offsetx=" + offsetx +
        '&offsety=' + offsety +
        "&dimx=" + dimx +
        '&dimy=' + dimy

    previewImg.src = address;
    previewImg.hidden = false;
}

function focusOnNoScoll(elm) {
    console.log("Changing focus without scroll");
    x = window.scrollX;
    y = window.scrollY;
    elm.focus();
    window.scrollTo(x, y);
}

function time_start() {
    console.log("Start: " + myMedia.currentTime);
    start_times.push(myMedia.currentTime);

    if (lastFocus == null) {
        lastFocus = document.getElementById("start_0");
    }
    if (lastFocus.id.startsWith("stop")) {
        lastFocus = document.getElementById(
            "start_" + (parseInt(lastFocus.id.split("_")[1]) + 1)
        );
    }

    lastFocus.value = myMedia.currentTime.toFixed(2);
    focusOnNoScoll(
        document.getElementById(
            "stop_" + parseInt(lastFocus.id.split("_")[1])
        )
    );
}

function time_stop() {
    console.log("Stop: " + myMedia.currentTime);
    stop_times.push(myMedia.currentTime);

    if (lastFocus == null) {
        lastFocus = document.getElementById("start_0");
    }
    if (lastFocus.id.startsWith("start")) {
        lastFocus = document.getElementById(
            "stop_" + lastFocus.id.split("_")[1]
        );
    }

    lastFocus.value = myMedia.currentTime.toFixed(2);

    if (
        lyrics.value.split("\n").length >
        parseInt(lastFocus.id.split("_")[1]) + 1
    ) {
        focusOnNoScoll(
            document.getElementById(
                "start_" + (parseInt(lastFocus.id.split("_")[1]) + 1)
            )
        );
    }
}

function numLostFocus(num) {
    console.log("Changing focus to " + num);
    lastFocus = num;
}

function updated() {
    console.log("Updating table");
    textAreaAdjust(lyrics);
    if (lyrics.value == "") {
        tbl.parentElement.parentElement.hidden = true;
    } else {
        lines = lyrics.value.split("\n");
        console.log(lines);
        output_tbl =
            "<tr><th>Line</th>" +
            '<th><button onclick="time_start()">Start</button></th>' +
            '<th><button onclick="time_stop()">Stop</button></th></tr>';

        tbl.parentElement.parentElement.hidden = false;
        start_times = [];
        stop_times = [];
        if (tableLength > 0) {
            for (let i = 0; i < tableLength; i++) {
                const line = lines[i];
                start_times.push(document.getElementById("start_" + i).value);
                stop_times.push(document.getElementById("stop_" + i).value);
            }
        }

        i = 0;
        lines.forEach((line) => {
            output_tbl +=
                "<tr><td>" +
                line +
                '</td><td> <input type="number" id="start_' +
                i +
                '" min="0" step="0.01" onfocus="numLostFocus(start_' +
                i +
                ')"> </td><td> <input type="number" id="stop_' +
                i +
                '" min="0" step="0.01" onfocus="numLostFocus(stop_' +
                i +
                ')"> </td></tr>';

            i++;
        });
        console.log(start_times, stop_times);

        tableLength = lines.length;

        tbl.innerHTML = output_tbl;
        if (Math.min(start_times.length, lines.length) > 0) {
            for (let j = 0; j < Math.min(start_times.length, lines.length); j++) {
                const line = lines[j];
                console.log(
                    "Setting line " +
                    j +
                    " to " +
                    start_times[j] +
                    ", " +
                    stop_times[j]
                );

                document.getElementById("start_" + j).value = start_times[j];
                document.getElementById("stop_" + j).value = stop_times[j];
            }
        }
    }
}

function fillTime() {
    console.log("Making audio fill video length")
    if (videoUpload.files.length == 0) {
        showElementError(videoUpload, "Please upload a video")
        return
    }
    // find video duration
    if (audioUpload.files.length == 1) {
        content = myAudio
    } else {
        content = myVideo
    }

    audioDuration = getAudioDuration(content)

    videoStartTime = document.getElementById("vid_start").value
    if (videoEnd.value == 0) {
        videoEndTime = myVideo.duration
    } else {
        videoEndTime = videoEnd.value
    }
    videoSpeed.value = ((videoEndTime - videoStartTime) / audioDuration).toFixed(2)

    document.getElementById("crop_vid").checked = true
    document.getElementById("crop_aud").checked = true
}

function numberUpdate(curId) {
    console.log("Checking value");

    if (curId.value != "") {
        if (myMedia == null) {
            dur = 1000000;
        } else {
            dur = myMedia.duration.toFixed(2);
        }
        curId.value = Math.min(dur, Math.max(0, curId.value)).toFixed(2);
    }
}

function vidStartCheck(curId) {
    if (curId.value != "") {
        if (myVideo == null) {
            dur = 1000000;
        } else {
            dur = myVideo.duration.toFixed(2);
        }
        curId.value = Math.min(dur, Math.max(0, curId.value)).toFixed(2);
    }
}

function fontCheck(curId, min, max) {
    curId.value = Math.min(max, Math.max(min, curId.value)).toFixed();
}

function showElementError(elm, msg) {
    if (elm.offsetHeight == 0) {
        hide(elm.closest("div").children[0])
    }
    elm.setCustomValidity(msg)
    elm.reportValidity()
}

function done() {
    console.log("Creating CSV");

    csv = "";
    i = 0;

    lines = lyrics.value.split("\n");
    console.log(lines);

    if (!(lines.length == 1 && lines[0].trim() == "")) {
        lines.forEach((line) => {
            start_time = document.getElementById("start_" + i).value;
            stop_time = document.getElementById("stop_" + i).value;

            if (stop_time == "") {
                if (lines.length > i + 1) {
                    stop_time = document.getElementById("start_" + (i + 1)).value;
                } else {
                    if (myMedia != null) {
                        stop_time = myMedia.duration;
                    } else {
                        stop_time = "";
                    }
                }
            }

            csv += '"' + line + '", ' + start_time + ", " + stop_time + "\r";

            i++;
        });
    }

    write.value = csv;
}

function getAudioDuration() {
    content = getAudioSource()
    
    audioStartTime = document.getElementById("audio_start").value
    if (audioEnd.value == 0) {
        audioEndTime = content.duration
    } else {
        audioEndTime = audioEnd.value
    }
    return (audioEndTime - audioStartTime) / audioSpeed.value
}

function getVideoDuration() {
    videoStartTime = document.getElementById("vid_start").value
    if (videoEnd.value == 0) {
        videoEndTime = myVideo.duration
    } else {
        videoEndTime = videoEnd.value
    }
    return (videoEndTime - videoStartTime) / videoSpeed.value
}

function getAudioSource() {
    // Find audio source
    if (audioUpload.files.length == 1) {
        return myAudio
    } else {
        return myVideo
    }
}

function getDuration() {
    videoDuration = getVideoDuration()
    audioDuration = getAudioDuration()

    cropVideo = document.getElementById("crop_vid").checked
    cropAudio = document.getElementById("crop_aud").checked

    if (cropVideo && cropAudio) {
        duration = Math.min(videoDuration, audioDuration)
    } else if (cropVideo) {
        duration = audioDuration
    } else if (cropAudio) {
        duration = videoDuration
    } else {
        duration = Math.max(videoDuration, audioDuration)
    }
    return duration
}

function checkForm() {
    // Check CSV
    if (lyrics.value.trim() == "") {
        write.value = ""
    } else {
        done()

        // Check order of items
        for (let i = 0; i < lyrics.value.split("\n").length; i++) {
            start_elm = document.getElementById("start_" + i);
            stop_elm = document.getElementById("stop_" + i);
            if (
                parseFloat(start_elm.value) >=
                parseFloat(stop_elm.value)
            ) {
                showElementError(start_elm, "Stop is before start")
                return false;
            }

            else if (parseFloat(stop_elm.value) > getDuration()) {
                showElementError(start_elm, "Must be less than than " + getDuration())
                return false;
            }
        }
    }

    if (audioEnd.value != 0 && audioEnd.value < audioStart.value) {
        showElementError(audioEnd, "Audio end must be less than audio start")
        return false
    }

    return true
}

async function uploadElement(elm) {
    filename = elm.files[0].name;
    const response = await fetch('/getSignedURL?uuid=' + vid_id + "&filename=" + filename + "&purpose=" + elm.id)
    if (!await response.ok) {
        throw new Error('Network response for fetch was not ok.');
    }
    c = await response.text();
    url = c.replace(/\"/g, "")
    console.log("Got signedURL: " + url)
    console.log("Trying to upload " + filename)
    console.log('Starting Upload...')

    const sent = await fetch(url, {
        method: 'PUT',
        body: elm.files[0]
    })

    const finished = sent.ok
    if (finished) {
        console.log("Complete")
        return true;
    } else {
        console.log("Failed upload of " + elm.files[0].name)
        alert("Failed upload of " + elm.files[0].name)
        return false;
    }
}

function htmlValidation() {
    inputs = document.getElementsByTagName("input")
    for (const elm of inputs) {
        elm.setCustomValidity("")
        if (elm.type != 'file' && !elm.checkValidity()) {
                showElementError(elm, elm.validationMessage)
                return false
        }
    }
    return true
}

function checkFileSize() {
    // check the file size
    if (videoUpload.files.length == 1) {
        videoSize = videoUpload.files[0].size
    } else {
        videoSize = 0
    }

    if (audioUpload.files.length == 1) {
        audioSize = audioUpload.files[0].size
    } else {
        audioSize = 0
    }

    if (audioSize + videoSize > 300000000) {
        alert("Unable to upload, combined filesize must be below 300MB")
        return false
    } else {
        return true
    }
}

function checkDuration() {
    // Check file length
    duration = getDuration()

    if (duration > 300) {
        alert("Max video length 5 minutes (after applying speed change)")
        return false
    } else {
        return true
    }
}

async function uploadContent() {
    if (videoUpload.files.length != 1) {
        showElementError(videoUpload, "Please select a video")
        return false
    }

    document.getElementById("submitbutton").innerHTML = "Uploading Video..."
    if (!await uploadElement(videoUpload)) {
        alert("Unable to upload video")
        return false
    } else {
        videoType.value = videoUpload.value.split(".")[videoUpload.value.split(".").length - 1]
    }

    if (audioUpload.files.length == 1) {
        document.getElementById("submitbutton").innerHTML = "Uploading Audio..."
        if (!await uploadElement(audioUpload)) {
            alert("Audio detected but unable to upload")
            return false
        } else {
            audioType.value = audioUpload.value.split(".")[audioUpload.value.split(".").length - 1]
        }
    }

    return true
}

async function submitForm() {
    if (uploading) {
        return
    }
    console.log("Trying submit")
    valid = true
    uploading = true

    document.getElementById("submitbutton").innerHTML = "Subitting..."

    if (valid) {
        valid = htmlValidation()
    }

    if (valid) {
        valid = checkForm()
    }

    if (valid) {
        valid = checkFileSize()
    }

    if (valid) {
        valid = checkDuration()
    }

    if (valid) {
        valid = await uploadContent()
    }

    if (valid) {
        document.getElementById("uuid").value = vid_id
        document.getElementById("submitbutton").innerHTML = "Submitting From Data..."
        document.getElementById("theform").submit()
    } else {
        console.log("Failed to submit")
        document.getElementById("submitbutton").innerHTML = "Submit"
        uploading = false
    }
}

function hide(t, media = false) {
    console.log("Toggle")
    e = t.nextElementSibling
    if (media) {
        e.children[0].pause()
    }

    e.hidden = !e.hidden
}

function update_highlight() {
    var rows = tbl.getElementsByTagName('tr');
    var upper;
    for (var i = 1; i < rows.length; i++) {
        row = rows[i]
        cols = row.getElementsByTagName('td');

        // Stop value not there
        if (cols[2].children[0].value == "") {
            if (rows.length == i + 1) {
                upper = myMedia.duration
            } else {
                // Next row start value not there
                if (rows[i + 1].getElementsByTagName('td')[1].children[0].value == "") {
                    // Dont highlight row
                    upper = cols[1].children[0].value
                } else {
                    // upper = next row start value
                    upper = rows[i + 1].getElementsByTagName('td')[1].children[0].value
                }
            }
        } else {
            // upper = stop value
            upper = cols[2].children[0].value
        }

        if (cols[1].children[0].value == "") {
            lower = myMedia.duration
        } else {
            lower = cols[1].children[0].value
        }

        // currentTime between start and stop times
        if (lower < myMedia.currentTime && myMedia.currentTime < upper) {
            row.className = "highlight";
        } else {
            row.className = "";
        }
    }
}

async function getID() {
    vid_id = (await (await fetch('getUUID')).text()).replace(/"/g, "")
}

document.addEventListener('DOMContentLoaded', function () {
    textAreaAdjust(lyrics)
    getID()
}, false);
