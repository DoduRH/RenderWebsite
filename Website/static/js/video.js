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
    fileBlob = videoUpload.files[0]
    url = (URL || webkitURL).createObjectURL(fileBlob)

    console.log("Set as source")
    /*myVideo.closest('#tab').hidden = false
    myVideo.parentElement.hidden = false*/

    if (videoUpload.files[0].type.includes("video")) {
        myImage.hidden = true
        myVideo.hidden = false
        if (myAudio.src == "") {
            myMedia = myVideo
        }
        myVideo.src = url
        changeSpeed(myVideo, videoSpeed.value)

        videoStart.max = myVideo.duration
        videoEnd.max = myVideo.duration
    } else {
        myVideo.hidden = true
        myImage.hidden = false

        myImage.src = url
    }
}

window.onresize = function() {
    elms = document.getElementsByClassName("expanded")
    for (let i = 0; i < elms.length; i++) {
        e = elms[i]
        e.style = "--extendedHeight: " + e.children[0].offsetHeight + "px;"
    }

    document.getElementsByTagName("header")[0].style = "width: " + window.innerWidth + "px;"
}

myVideo.oncanplay = function (e) {
    if (videoUpload.files[0].type.includes("video")) {
        if (myVideo.videoWidth * myVideo.videoHeight > 1920 * 1080) {
            videoUpload.value = ""
            alert("Video resolution too high please select another file, 1080p max")
            return
        }
    } else {
        if (myImage.naturalWidth * myImage.naturalHeight > 1920 * 1080) {
            videoUpload.value = ""
            alert("Image resolution too high please select another file, max 1920x1080")
            return
        }
    }
}

myVideo.onloadeddata = function(e) {
    changeVisualAreaSize()
}

myImage.onload = function(e) {
    changeVisualAreaSize()
}

function changeVisualAreaSize() {
    console.log("Loaded video")
    myVideo.closest('#tab').classList.remove("expandable", "minimised")
    myVideo.closest('#tab').classList.add("capsule")

    e = myVideo.closest('#hider')
    e.style = "--extendedHeight: " + e.children[0].offsetHeight + "px;"
    e.classList.add("expanded")
    e.classList.remove("minimised")
}

myAudio.onloadeddata = function(e) {
    changeAudioAreaSize()
}

function changeAudioAreaSize() {
    console.log("Loaded audio")
    myAudio.closest('#tab').classList.remove("expandable", "minimised")
    myAudio.closest('#tab').classList.add("capsule")

    e = myAudio.closest('#hider')
    e.style = "--extendedHeight: " + e.children[0].offsetHeight + "px;"
    e.classList.add("expanded")
    e.classList.remove("minimised")
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
        video_result = myVideo.duration
        videoDuration = video_result

        if (audioUpload.files.length == 1) {
            audioDuration = myAudio.duration
        } else {
            audioDuration = video_result
        }
    } else {
        // Image or solid colour is used for visuals
        if (audioUpload.files.length == 1) {
            audioDuration = myAudio.duration
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
    fileBlob = audioUpload.files[0]
    url = (URL || webkitURL).createObjectURL(fileBlob)

    myAudio.src = url
    myMedia = myAudio

    setMaxMediaValues()
    changeAudioAreaSize()
}

function changeSpeed(elm, s) {
    elm.playbackRate = s
}

audio_speed.onchange = function () {
    console.log("Changed speed of audio")
    if (getRadioValue("audioSource") == "video" && document.getElementById("advanced_options").checked) {
        changeSpeed(myVideo, audioSpeed.value)
    } else {
        changeSpeed(myAudio, audioSpeed.value)
    }
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
    for (let i = 0; i < items.length; i++) {
        if (items[i].checked) {
            return items[i].value
        }
    }
    return false
}

function imgToBase64(img) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
  
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

function captureVideo(video) {
    var canvas = document.createElement("canvas")
    var ctx = canvas.getContext("2d")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/png')
}

function get_first_text() {
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
        if (lower <= myMedia.currentTime && myMedia.currentTime < upper) {
            return cols[0].innerText
        }
    }
    return ""
}

function previewFrame() {
    if (previewing) {
        console.log("Preview in progress")
        return
    }
    var previewing = true
    previewImg.closest("div").style = "--extendedHeight: " + previewImg.closest("div").children[0].offsetHeight + "px;"
    textPosition = getRadioValue("text_position")
    visualType = getVisualType()
    if (visualType != "solid") {
        if (videoUpload.files.length == 0) {
            console.log("No preview for you")
            showElementError(videoUpload, "Please upload a video")
            return
        } else if (visualType == "video") {
            imageData = captureVideo(myVideo)
        } else if (visualType == "image") {
            imageData = imgToBase64(myImage)
        }
    }
    if (!htmlValidation()) {
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

    if (!textPosition) {
        textPosition = "mm"
    }

    if (document.getElementById("visibleShadow").checked) {
        visible = true
        shadx = document.getElementById("shadow_offset_x").value
        shady = document.getElementById("shadow_offset_y").value
        shadow = document.getElementById("shadowColour").value.replace("#", "")
    } else {
        visible = false
        shadx = 0
        shady = 0
        shadow = "000000"
    }

    text = get_first_text()
    if (text != "" && document.getElementById("verses").checked) {
        text = text.split("\n").join("|")
    }

    maincol = document.getElementById("textColour").value.replace("#", "")
    size = document.getElementById("font_size").value
    position = textPosition
    maxWidth = document.getElementById("text_width").value
    backgroundType = getVisualType()
    background = document.getElementById("background_colour").value.replace("#", "")

    args = {
        'text': text,
        'maincol': maincol,
        'bgtype': backgroundType,
        'background': background,
        'visible': visible,
        'shadow': shadow,
        'fontsize': size,
        'position': position,
        'maxWidth': maxWidth,
        'shadx': shadx,
        'shady': shady
    }
    if (visualType != "solid") {
        args['media'] = imageData
    }

    fetch('/prev',{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
        }
      ).then(
        response => response.blob()
      ).then(
        success => previewImg.src = URL.createObjectURL(success)
      ).catch(
        error => console.log(error) // Handle the error response object
      );
      previewing = false
      previewImg.closest("div").style = "--extendedHeight: " + previewImg.closest("div").children[0].offsetHeight + "px;"
}

function onPreviewLoad() {
    previewImg.hidden = false
    document.getElementById("tablePreview").parentElement.style = "--extendedHeight: " + document.getElementById("tablePreview").offsetHeight + "px;"
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

function setCookie(t) {
    if (t.value != "") {
        document.cookie = t.id + '=' + encodeURIComponent(t.value)
    }
}

function update_all_verse() {
    updated(lyrics)
    document.cookie = "verses=" + encodeURIComponent(document.getElementById("verses").checked)

    elms = tbl.getElementsByTagName("input")
    for (let i = 0; i < elms.length; i++) {
        setCookie(elms[i])
    }
}

function setoverflow(t, value) {
    t.closest(".expandable").style.overflow = value
}

function updated(t, cookie=true) {
    console.log("Updating table")
    textAreaAdjust(lyrics)
    setCookie(t)

    // Set required for text
    tableText = document.getElementById("tableText")
    elms = tableText.getElementsByTagName("input")
    for (let i=0; i < elms.length; i++) {
        if (elms[i].type != "checkbox") {
            elms[i].required = (lyrics.value != "")
        }
    }

    if (lyrics.value == "") {
        document.getElementById("tableText").closest(".capsule").hidden = true
        deleteCookie("lyricsArea")
        e = tbl.closest('div')
        e.style = "--extendedHeight: " + e.children[0].offsetHeight + "px;"
        e.classList.remove("expanded")
        e.classList.add("minimised")
    } else {
        document.getElementById("tableText").closest(".capsule").hidden = false
        document.getElementById("text_tl").required = true
        if (document.getElementById("verses").checked) {
            lines = lyrics.value.split("\n\n")
        } else {
            lines = lyrics.value.split("\n")
        }
        console.log(lines)
        output_tbl =
            "<tr><th>Line</th>" +
            '<th><button onclick="time_start()">Start</button></th>' +
            '<th><button onclick="time_stop()">Stop</button></th></tr>' // this may be an issue

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
                line.replace(/\n/g, "<br>") +
                '</td><td> <input type="number" id="start_' +
                i +
                '" min="0" step="0.01" onfocus="numLostFocus(start_' +
                i +
                ')" onchange="setCookie(this)"> </td><td> <input type="number" id="stop_' +
                i +
                '" min="0" step="0.01" onfocus="numLostFocus(stop_' +
                i +
                ')" onchange="setCookie(this)"> </td></tr>'

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
        e = tbl.closest('div')
        e.style = "--extendedHeight: " + e.children[0].offsetHeight + "px;"
        e.classList.add("expanded")
        e.classList.remove("minimised")
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
    e = elm.closest('div')
    e.style = "--extendedHeight: " + e.children[0].offsetHeight + "px;"
    e.classList.add("expanded")
    e.classList.remove("minimised")
    
    elm.setCustomValidity(msg)
    elm.reportValidity()
}

function done() {
    console.log("Creating CSV")

    csv = []
    i = 0

    lines = lyrics.value.split("\n")
    loops = tbl.rows.length - 1
    console.log(lines)

    if (!(loops == 1 && lines[0].trim() == "")) {
        verse = ""
        for (let i = 0; i < loops; i++) {
            start_time = document.getElementById("start_" + i).value
            stop_time = document.getElementById("stop_" + i).value
            if (start_time == "") {
                showElementError(document.getElementById("start_" + i), "Please enter a start time for this line")
                return false
            }

            if (stop_time == "") {
                if (loops > i + 1) {
                    stop_time = document.getElementById("start_" + (i + 1)).value
                    if (parseFloat(stop_time) <= parseFloat(start_time)) {
                        showElementError(document.getElementById("start_" + i), "Timing error here")
                        return false
                    }
                } else {
                    if (getAudioSource(null) == null) {
                        alert("No audio content present")
                        return false
                    } else {
                        if (start_time == "") {
                            showElementError(document.getElementById("start_" + i), "Please enter a start time for this line")
                            return false
                        }
                        stop_time = getAudioSource().duration
                    }  
                }
            }

            if (document.getElementById("verses").checked) {
                line = lyrics.value.split("\n\n")[i].split("\n").join("|")
            } else {
                line = lines[i]
            }
            line = line.replace(/"/g, '""')
            csv.push('"' + line + '", ' + start_time + ", " + stop_time)
        }
    }

    write.value = csv.join("\r")
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

function getAudioSource(defaultValue=myVideo) {
    // Find audio source
    if (document.getElementById("videoSource").checked) {
        return myVideo
    } else if (document.getElementById("audioSource").checked) {
        return myAudio
    } else {
        console.log("No audio source selected")
        return defaultValue
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
        for (let i = 0; i < tbl.rows.length - 1; i++) {
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

    if (audioEnd.value != 0 && parseFloat(audioEnd.value) < parseFloat(audioStart.value)) {
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
    return ""
}

function htmlValidation() {
    if (getVisualType() == "") {
        showElementError(document.getElementById("videoType"), "Select background type")
        return false
    }
    if (!setMaxMediaValues()) {
        return false
    }

    if (!document.getElementById("visibleShadow").checked) {
        if (document.getElementById("shadow_offset_x").value == "") {
            document.getElementById("shadow_offset_x").value = 0
        }
        if (document.getElementById("shadow_offset_y").value == "") {
            document.getElementById("shadow_offset_y").value = 0
        }
        if (document.getElementById("shadowColour").value == "") {
            document.getElementById("shadowColour").value = "#000000"
        }
    }

    visualType = getVisualType()

    if (visualType == "") {
        showElementError(document.getElementById("videoType"), "Select background type")
        return false
    }

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
        if (audioSource == "video" && elm.className.includes("copy") && !document.getElementById("advanced_options").checked) { // copy values from video version
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

function checkLyricAscii() {
    position = lyrics.value.search('[^\n-~]')
    if (position == -1) {
        return true
    } else {
        alert(lyrics.value[position] + " in position " + position + " is not an allowed character.  Try typing a similar character from your keyboard")
        return false
    }
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
        valid = checkLyricAscii()
    }

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

function hide(e, media=false, index=0) {
    console.log("Toggle")
    if (media) {
        e.getElementsByClassName("mediaplayer")[0].pause()
    }

    e.style = "--extendedHeight: " + e.children[index].offsetHeight + "px;"
    e.classList.toggle("expanded")
    e.classList.toggle("minimised")
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
    tableElements = document.getElementById("tableVisual").getElementsByClassName('all')
    for (let i = 0; i < tableElements.length; i++) {
        tableElements[i].hidden = !tableElements[i].className.includes(newType)
    }

    if (videoUpload.files.length == 0) {
        filetype = ""
    } else {
        filetype = videoUpload.files[0].type
    }

    if (newType == "solid" || !filetype.includes(newType)) {
        // REMINDER: hide the video element?
    } else {
        // REMINDER: show the video element?
        displayElements = myVideo.closest("#tab").getElementsByClassName("all")
        for (let i = 0; i < displayElements.length; i++) {
            if (!displayElements[i].hidden) {
                displayElements[i].hidden = !displayElements[i].className.includes(newType)
            }
        }
    }
    document.getElementById("tableVisual").parentElement.style = "--extendedHeight: " + document.getElementById("tableVisual").offsetHeight + "px;"
}

function advancedOption() {
    if (document.getElementById("advanced_options").checked) {
        audioSourceChange("audio")
        audioUpload.closest("tr").hidden = true
    } else {
        audioSourceChange("video")
    }
}

function audioSourceChange(newSource) {
    console.log(newSource)
    audioFitTime()
    elements = document.getElementById("tableAudio").getElementsByClassName('all')
    for (let i = 0; i < elements.length; i++) {
        elements[i].hidden = !elements[i].className.includes(newSource)
    }
    myAudio.closest("#tab").hidden = (audioUpload.length == 0) || (newSource != "audio")
    adv = document.getElementById("advanced_options")
    if (getRadioValue('audioSource') == "video") {
        adv.closest("tr").hidden = false
        if (newSource == "video" && adv.checked) {
            audioSourceChange('audio')
        }
    } else {
        adv.closest("tr").hidden = true
    }
    document.getElementById("tableAudio").parentElement.style = "--extendedHeight: " + document.getElementById("tableAudio").offsetHeight + "px;"
}

function shadowChange() {
    console.log("Changing shadowchange")
    t = document.getElementById("visibleShadow")
    elements = t.closest("table").getElementsByClassName("shadow_properties")

    for (let i = 0; i < elements.length; i++) {
        elements[i].hidden = !t.checked
    }
    document.getElementById("tableText").parentElement.style = "--extendedHeight: " + document.getElementById("tableText").offsetHeight + "px;"
}

function confirmDeleteTimingInfo () {
    if (confirm("Do you want to remove lyrics and timing information FOREVER?")) {
        deleteTimingInfo()
    }
}

function deleteTimingInfo() {
    regStart = /(start_[0-9]|stop_[0-9])/g
    while ((match = regStart.exec(document.cookie)) != null) {
        deleteCookie(match[0])
    }
    deleteCookie("verses")
    deleteCookie("lyricsArea")
    loadFromCookies()
}

function deleteCookie(cname) {
    var name = cname + "="
    var decodedCookie = decodeURIComponent(document.cookie)
    var ca = decodedCookie.split(';')
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i]
      while (c.charAt(0) == ' ') {
        c = c.substring(1)
      }
      if (c.indexOf(name) == 0) {
        // Found cookie with cname
        document.cookie = name + "; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        return
      }
    }
    return
}

function getCookie(cname) {
    var name = cname + "="
    var decodedCookie = decodeURIComponent(document.cookie)
    var ca = decodedCookie.split(';')
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i]
      while (c.charAt(0) == ' ') {
        c = c.substring(1)
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length)
      }
    }
    return ""
}

function videoTime(e, t, loc) {
    if (e.key == " ") {
        if (loc == "video") {
            media = myVideo
        } else if (loc == "audio") {
            media = getAudioSource() 
        }
        t.value = media.currentTime.toFixed(2)
    }
}

function loadFromCookies() {
    document.getElementById("verses").checked = getCookie("verses") == "true"
    lyrics.value = getCookie("lyricsArea")
    updated(lyrics)

    if (lyrics.value == "") {
        tbl.parentElement.classList.add("minimised")
    } else {
        tbl.parentElement.classList.add("expanded")
        if (document.getElementById("verses").checked) {
            len = lyrics.value.split("\n\n").length
        } else {
            len = lyrics.value.split("\n").length
        }
        for (let i = 0; i < len; i++) {
            document.getElementById("start_" + i).value = getCookie("start_" + i)
            document.getElementById("stop_" + i).value = getCookie("stop_" + i)
        }
    }
}

function cookieDisplay() {
(function() {
    'use strict';
    var storageKey = '__cookiesAccepted__';
    if (!isStorageAllowed() || isSetPreference()) return;
    initializeNotice();
    function initializeNotice() {
        var el = document.getElementsByClassName('cookie-notice')[0];
        var dismissEl = el.getElementsByClassName('cookie-notice-dismiss')[0];

        el.style.display = 'block';

        dismissEl.addEventListener('click', function() {
            el.style.display = 'none';
            setPreferenceAccepted();
        }, false);
    }
    
    function setPreferenceAccepted() {
        localStorage.setItem(storageKey, true);
    }
    
    function isSetPreference() {
        return JSON.parse(localStorage.getItem(storageKey) || false);
    }
    
    function isStorageAllowed() {
        var test = '__localStorageTest__';

        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);

            return true;
        } catch (e) {
            console.warn('Storage not allowed, please allow cookies');
            return false;
        }
    };
}());
}

document.addEventListener('DOMContentLoaded', function () {
    loadFromCookies()
    textAreaAdjust(lyrics)
    getID()
    cookieDisplay()
}, false)
