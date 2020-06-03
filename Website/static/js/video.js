var myVideo = document.getElementById("video1")
var myImage = document.getElementById("image1")
var myAudio = document.getElementById("audio1")
var videoUpload = document.getElementById("videoUpload")
var audioUpload = document.getElementById("audioUpload")
var videoExt = document.getElementById("videoExt")
var audioExt = document.getElementById("audioExt")

var videoStart = document.getElementById("video_start")
var videoEnd = document.getElementById("video_end")
var audioStart = document.getElementById("audio_start")
var audioEnd = document.getElementById("audio_end")
var write = document.getElementById("csv")
var csvHead = document.getElementById("csvHeading")
var lyrics = document.getElementById("lyricsArea")
var tbl = document.getElementById("table1")
var allMaxedAudio = [audioStart, audioEnd, document.getElementById("audio_fade_in"), document.getElementById("audio_fade_out")]
var allMaxedVideo = [document.getElementById("video_fade_in"), document.getElementById("video_fade_out")]
var audioSpeed = document.getElementById("audio_speed")
var videoSpeed = document.getElementById("video_speed")
var previewImg = document.getElementById("previewImg")
var lastFocus = null
var myMedia
var tableLength = 0
var timerID
var c
var uploading
var video_id

var start_times = []
var stop_times = []

function videoChange() {
    console.log("New video")
    var reader = new FileReader()
    reader.onload = function (e) {
        console.log("Set as source")
        myVideo.closest('#tab').hidden = false
        myVideo.parentElement.hidden = false

        if (videoUpload.files[0].type.includes("video")) {
            myImage.hidden = true
            myVideo.hidden = false
            if (myAudio.src == "") {
                myMedia = myVideo
            }
            myVideo.src = this.result
            changeSpeed(myVideo, videoSpeed.value)

            videoStart.max = myVideo.duration
            videoEnd.max = myVideo.duration
        } else {
            myVideo.hidden = true
            myImage.hidden = false

            myImage.src = this.result
        }
    }
    reader.readAsDataURL(videoUpload.files[0])
}


myVideo.oncanplay = function (e) {
    if (videoUpload.files[0].type.includes("video")) {
        if (myVideo.videoWidth * myVideo.videoHeight > 1920 * 1080) {
            myVideo.closest('#tab').hidden = true
            videoUpload.value = ""
            alert("Video resolution too high please select another file, 1080p max")
            return
        }
    } else {
        if (myImage.naturalWidth * myImage.naturalHeight > 1920 * 1080) {
            myVideo.closest('#tab').hidden = true
            videoUpload.value = ""
            alert("Image resolution too high please select another file, max 1920x1080")
            return
        }
    }
}

function setMaxMediaValues() {
    visualType = getVisualType()
    if (visualType == "video") {
        if (videoUpload.files.length == 0) {
            showElementError(videoUpload, "Please upload a video")
            return false
        }

        if (videoStart.value > myVideo.duration) {
            showElementError(videoStart, "This value is too high")
            return false
        }

        if (videoEnd.value > myVideo.duration) {
            showElementError(videoEnd, "This value is too high")
            return false
        }
    }

    if (visualType == "video" && videoUpload.files[0].type.includes("video")) {
        // Video is used for visuals
        video_result = getVideoDuration()
        videoDuration = video_result

        if (audioUpload.files.length == 1) {
            audioDuration = getAudioDuration()
        } else {
            audioDuration = video_result
        }
    } else {
        // Image or solid colour is used for visuals
        if (audioUpload.files.length == 1) {
            audioDuration = getAudioDuration()
            videoDuration = audioDuration
        } else {
            alert("No audio content is present")
            return false
        }
    }

    allMaxedAudio.forEach(elm => {
        elm.max = audioDuration
    })

    allMaxedVideo.forEach(elm => {
        elm.max = videoDuration
    })
    return true
}

function audioChange() {
    console.log("New audio")
    var reader = new FileReader()
    reader.onload = function (e) {
        console.log("Set as source")
        myAudio.src = this.result
        myAudio.closest('#tab').hidden = false

        myMedia = myAudio
    }

    reader.readAsDataURL(audioUpload.files[0])

    setMaxMediaValues()
}

function changeSpeed(elm, s) {
    elm.playbackRate = s
}

audio_speed.onchange = function () {
    console.log("Changed speed of audio")
    changeSpeed(myAudio, audioSpeed.value)
}

video_speed.onchange = function () {
    console.log("Changed speed of video")
    changeSpeed(myVideo, videoSpeed.value)
}

myVideo.onplay = (e) => {
    if (myVideo == myMedia) {
        console.log("Playing media")
        timerID = setInterval(update_highlight, 100)
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
        timerID = setInterval(update_highlight, 100)
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
        timerID = setInterval(update_highlight, 100)
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
        timerID = setInterval(update_highlight, 100)
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
    }
}

function textAreaAdjust(o) {
    o.style.width = "1px"
    o.style.width = Math.max((25 + o.scrollWidth), 253) + "px"
    o.style.height = "1px"
    o.style.height = Math.max(5 + (o.scrollHeight), 25) + "px"
}

function getRadioValue(name) {
    items = document.getElementsByName(name)
    for (let i = 1; i < items.length; i++) {
        if (items[i].checked) {
            return items[i].value
        }
    }
    return false
}

function previewFrame() {
    previewImg.hidden = true
    textPosition = getRadioValue("text_position")
    visualType = getVisualType()
    if (visualType != "solid" && videoUpload.files.length == 0) {
        console.log("No preview for you")
        showElementError(videoUpload, "Please upload a video")
        return
    } else if (!htmlValidation()) {
        return
    } else if (!textPosition) {
        showElementError(document.getElementById("text_mm"), "Please select the position of the preview text")
        return
    } else {
        if (visualType == "solid") {
            dimx = 1920
            dimy = 1080
        }else if (videoUpload.files[0].type.includes("video")) {
            dimx = myVideo.videoWidth
            dimy = myVideo.videoHeight
        } else {
            dimx = myImage.naturalHeight
            dimy = myImage.naturalWidth
        }
    }

    maincol = document.getElementById("textColour").value.replace("#", "")
    visible = document.getElementById("visibleShadow").checked
    shadow = document.getElementById("shadowColour").value.replace("#", "")
    size = document.getElementById("font_size").value
    position = textPosition
    maxWidth = document.getElementById("text_width").value

    address = '/prev' +
        '?maincol=' + maincol +
        "&visible=" + visible +
        "&shadow=" + shadow +
        '&fontsize=' + size +
        "&position=" + position +
        '&maxWidth=' + maxWidth +
        "&dimx=" + dimx +
        '&dimy=' + dimy

    previewImg.src = address
    previewImg.hidden = false
}

function focusOnNoScoll(elm) {
    console.log("Changing focus without scroll")
    x = window.scrollX
    y = window.scrollY
    elm.focus()
    window.scrollTo(x, y)
}

function time_start() {
    console.log("Start: " + myMedia.currentTime)
    start_times.push(myMedia.currentTime)

    if (lastFocus == null) {
        lastFocus = document.getElementById("start_0")
    }
    if (lastFocus.id.startsWith("stop")) {
        lastFocus = document.getElementById(
            "start_" + (parseInt(lastFocus.id.split("_")[1]) + 1)
        ) // this may be an issue
    }

    lastFocus.value = myMedia.currentTime.toFixed(2)
    focusOnNoScoll(
        document.getElementById(
            "stop_" + parseInt(lastFocus.id.split("_")[1])
        )
    )
}

function time_stop() {
    console.log("Stop: " + myMedia.currentTime)
    stop_times.push(myMedia.currentTime)

    if (lastFocus == null) {
        lastFocus = document.getElementById("start_0")
    }
    if (lastFocus.id.startsWith("start")) {
        lastFocus = document.getElementById(
            "stop_" + lastFocus.id.split("_")[1]
        ) // this may be an issue
    }

    lastFocus.value = myMedia.currentTime.toFixed(2)

    if (
        lyrics.value.split("\n").length >
        parseInt(lastFocus.id.split("_")[1]) + 1
    ) {
        focusOnNoScoll(
            document.getElementById(
                "start_" + (parseInt(lastFocus.id.split("_")[1]) + 1)
            )
        )
    }
}

function numLostFocus(num) {
    console.log("Changing focus to " + num)
    lastFocus = num
}

function updated() {
    console.log("Updating table")
    textAreaAdjust(lyrics)
    if (lyrics.value == "") {
        tbl.parentElement.parentElement.hidden = true
        document.getElementById("text_tl").required = false
    } else {
        document.getElementById("text_tl").required = true
        lines = lyrics.value.split("\n")
        console.log(lines)
        output_tbl =
            "<tr><th>Line</th>" +
            '<th><button onclick="time_start()">Start</button></th>' +
            '<th><button onclick="time_stop()">Stop</button></th></tr>' // this may be an issue

        tbl.parentElement.parentElement.hidden = false
        start_times = []
        stop_times = []
        if (tableLength > 0) {
            for (let i = 0; i < tableLength; i++) {
                const line = lines[i]
                start_times.push(document.getElementById("start_" + i).value)
                stop_times.push(document.getElementById("stop_" + i).value)
            }
        }

        i = 0
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
                ')"> </td></tr>'

            i++
        })
        console.log(start_times, stop_times)

        tableLength = lines.length

        tbl.innerHTML = output_tbl
        if (Math.min(start_times.length, lines.length) > 0) {
            for (let j = 0; j < Math.min(start_times.length, lines.length); j++) {
                const line = lines[j]
                console.log("Setting line " + j + " to " + start_times[j] + ", " + stop_times[j])

                document.getElementById("start_" + j).value = start_times[j]
                document.getElementById("stop_" + j).value = stop_times[j]
            }
        }
    }
}

function fillTime() {
    console.log("Making audio fill video length")
    visualType = getVisualType()
    if (visualType != "video") {
        alert("Video must be selected for filling time")
        return
    }
    if (videoUpload.files.length == 0) {
        showElementError(videoUpload, "Please upload a video")
        return
    }
    if (audioUpload.files.length == 0) {
        showElementError(audioUpload, "Please upload audio")
        return
    }
    if (audioSpeed.value > 2 || audioSpeed.value < 0.5) {
        showElementError(audioSpeed, "Must be in the range 0.5 to 2")
        return
    }

    // find video duration
    audioSource = getRadioValue('audioSource')
    if (audioSource != "audio") {
        content = myVideo
    } else {
        content = myAudio
    }

    audioDuration = getAudioDuration(content)

    videoStartTime = document.getElementById("video_start").value
    if (videoEnd.value == 0) {
        videoEndTime = myVideo.duration
    } else {
        videoEndTime = videoEnd.value
    }
    videoSpeed.value = ((videoEndTime - videoStartTime) / audioDuration).toFixed(2)

    document.getElementById("crop_video").checked = true
    document.getElementById("crop_audio").checked = true
}

function numberUpdate(curId) {
    console.log("Checking value")

    if (curId.value != "") {
        if (myMedia == null) {
            dur = 1000000
        } else {
            dur = myMedia.duration.toFixed(2)
        }
        curId.value = Math.min(dur, Math.max(0, curId.value)).toFixed(2)
    }
}

function videoStartCheck(curId) {
    if (curId.value != "") {
        if (myVideo == null) {
            dur = 1000000
        } else {
            dur = myVideo.duration.toFixed(2)
        }
        curId.value = Math.min(dur, Math.max(0, curId.value)).toFixed(2)
    }
}

function fontCheck(curId, min, max) {
    curId.value = Math.min(max, Math.max(min, curId.value)).toFixed()
}

function showElementError(elm, msg) {
    if (elm.offsetHeight == 0) {
        hide(elm.closest("div").children[0])
    }
    elm.setCustomValidity(msg)
    elm.reportValidity()
}

function done() {
    console.log("Creating CSV")

    csv = ""
    i = 0

    lines = lyrics.value.split("\n")
    console.log(lines)

    if (!(lines.length == 1 && lines[0].trim() == "")) {
        for (let i = 0; i < lines.length; i++) {
            start_time = document.getElementById("start_" + i).value
            stop_time = document.getElementById("stop_" + i).value
            if (start_time == "") {
                showElementError(document.getElementById("start_" + i), "Please enter a start time for this line")
                return false
            }

            if (stop_time == "") {
                if (lines.length > i + 1) {
                    stop_time = document.getElementById("start_" + (i + 1)).value
                    if (stop_time <= start_time) {
                        showElementError(document.getElementById("start_" + i), "Timing error here")
                        return false
                    }
                } else {
                    if (myMedia != null) {
                        if (start_time == "") {
                            showElementError(document.getElementById("start_" + i), "Please enter a start time for this line")
                            return false
                        }
                        stop_time = myMedia.duration
                    } else {
                        showElementError(videoUpload, "Please upload a video")
                        return false
                    }
                }
            }

            csv += '"' + lines[i] + '", ' + start_time + ", " + stop_time + "\r"
        }
    }

    write.value = csv
    return true
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
    videoStartTime = document.getElementById("video_start").value
    if (videoEnd.value == 0) {
        videoEndTime = myVideo.duration
    } else {
        videoEndTime = videoEnd.value
    }
    return (videoEndTime - videoStartTime) / videoSpeed.value
}

function getAudioSource() {
    // Find audio source
    if (document.getElementById("videoSource").checked) {
        return myVideo
    } else if (document.getElementById("audioSource").checked) {
        return myAudio
    } else {
        console.log("No audio source selected")
        return myVideo
    }
}

function getDuration() {
    audioDuration = getAudioDuration()
    if (getVisualType() != "video") {
        return audioDuration
    }
    videoDuration = getVideoDuration()

    cropVideo = document.getElementById("crop_video").checked
    cropAudio = document.getElementById("crop_audio").checked

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
        if (!done()) {
            return false
        }

        // Check order of items
        for (let i = 0; i < lyrics.value.split("\n").length; i++) {
            start_elm = document.getElementById("start_" + i)
            stop_elm = document.getElementById("stop_" + i)
            if (
                parseFloat(start_elm.value) >=
                parseFloat(stop_elm.value)
            ) {
                showElementError(start_elm, "Stop is before start")
                return false
            }

            else if (parseFloat(stop_elm.value) > getDuration()) {
                showElementError(start_elm, "Must be less than than " + getDuration())
                return false
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
    filename = elm.files[0].name
    const response = await fetch('/getSignedURL?uuid=' + video_id + "&filename=" + filename + "&purpose=" + elm.id)
    if (!await response.ok) {
        throw new Error('Network response for fetch was not ok.')
    }
    c = await response.text()
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
        return true
    } else {
        console.log("Failed upload of " + elm.files[0].name)
        alert("Failed upload of " + elm.files[0].name)
        return false
    }
}

function getVisualType() {
    if (document.getElementById("videoType").checked) {
        return "video"
    } else if (document.getElementById("imageType").checked) {
        return "image"
    } else if (document.getElementById("solidType").checked) {
        return "solid"
    }
    return false
}

function htmlValidation() {
    if (!setMaxMediaValues()) {
        return false
    }

    visualType = getVisualType()

    if (document.getElementById("videoSource").checked) {
        audioSource = "video"
        if (visualType != "video") {
            alert("Please provide some media with audio")
            return false
        }
    } else if (document.getElementById("audioSource").checked) {
        audioSource = "audio"
    }

    inputs = document.getElementsByTagName("input")
    for (const elm of inputs) {
        elm.setCustomValidity("") // HERE
        if (audioSource == "video" && elm.className.includes("copy")) { // copy values from video version
            elm.value = document.getElementById(elm.id.replace("audio", "video")).value
        } else if (elm.className.includes("all") && elm.hidden) {
            elm.value = 0
        }

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
    visualType = getVisualType()
    if (visualType != "solid") { // Upload file if needed
        if (videoUpload.files.length != 1) {
            showElementError(videoUpload, "Please select a video")
            return false
        } else if (audioUpload.files.length == 0 && getVisualType() != "video") {
            showElementError(audioUpload, "Upload audio to use an image for visuals")
            return false
        }

        document.getElementById("submitbutton").innerHTML = "Uploading Video..."
        if (!await uploadElement(videoUpload)) {
            alert("Unable to upload video")
            return false
        }
        videoExt.value = videoUpload.value.split(".")[videoUpload.value.split(".").length - 1]

    } else if (audioUpload.files.length == 0) {
        alert("No audio detected")
        return false
    } else {  // Solid background and audio is present
        videoExt.value = "solid"
    }

    if (audioUpload.files.length == 1) {
        document.getElementById("submitbutton").innerHTML = "Uploading Audio..."
        if (!await uploadElement(audioUpload)) {
            alert("Audio detected but unable to upload")
            return false
        } else {
            audioExt.value = audioUpload.value.split(".")[audioUpload.value.split(".").length - 1]
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
        document.getElementById("uuid").value = video_id
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
    var rows = tbl.getElementsByTagName('tr')
    var upper
    for (var i = 1; i < rows.length; i++) {
        row = rows[i]
        cols = row.getElementsByTagName('td')

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
            row.className = "highlight"
        } else {
            row.className = ""
        }
    }
}

async function getID() {
    video_id = (await (await fetch('getUUID')).text()).replace(/"/g, "")
}

function audioFitTime() {
    // Audio 'Go' button
    document.getElementById("row_fill_time").hidden = !(getVisualType() == "video" && getRadioValue('audioSource') == "audio")
}

function videoTypeChange(newType) {
    console.log(newType)
    videoUpload.accept = newType + "/*"
    audioFitTime()
    elements = document.getElementById("tableVisual").getElementsByClassName('all')
    for (let i = 0; i < elements.length; i++) {
        elements[i].hidden = !elements[i].className.includes(newType)
    }
}

function audioSourceChange(newSource) {
    console.log(newSource)
    audioFitTime()
    elements = document.getElementById("tableAudio").getElementsByClassName('all')
    for (let i = 0; i < elements.length; i++) {
        elements[i].hidden = !elements[i].className.includes(newSource)
    }
}

document.addEventListener('DOMContentLoaded', function () {
    textAreaAdjust(lyrics)
    getID()
}, false)
