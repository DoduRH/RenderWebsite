var myVideo = document.getElementById("video1")
var myImage = document.getElementById("image1")
var canvas = document.getElementById("visualCanvas")
var ctx = canvas.getContext('2d')
var myAudio = document.getElementById("audio1")
var videoUpload = document.getElementById("videoUpload")
var audioUpload = document.getElementById("audioUpload")
var videoExt = document.getElementById("videoExt")
var audioExt = document.getElementById("audioExt")

var videoTop = 0
var videoBottom = 1080
var videoLeft = 0
var videoRight = 1920

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
var tableLength = 0
var timerID
var c
var uploading
var video_id

var start_times = []
var stop_times = []

var imgFiles = [];

// Helper method for creating elements
$.extend({
    el: function(el, props) {
        var $el = $(document.createElement(el));
        $el.attr(props);
        return $el;
    }
});

function inputDisplayName(t) {
    console.log("Changing display name")
    labelText = t.closest(".file-label").childNodes[5]

    if (t.files.length == 1) {
        t.closest(".file").classList.add("has-name");
        labelText.classList.remove("is-hidden");
        labelText.innerText = t.files[0].name;
    } else {
        t.closest(".file").classList.remove("has-name");
        labelText.classList.add("is-hidden");
    }
}

function videoChange(t) {
    console.log("New video")
    inputDisplayName(t)
    videoContentCard = document.getElementById("uploaded_video_card")
    cropVideoCard = document.getElementById("crop_video_card")
    previewFrameCard = document.getElementById("preview_frame_card")
    showCards = false


    if (videoUpload.files.length == 1) {
        fileBlob = videoUpload.files[0]
        url = (URL || webkitURL).createObjectURL(fileBlob)

        console.log("Set as source")

        if (videoUpload.files[0].type.includes("video")) {
            myImage.hidden = true
            myVideo.hidden = false
            myVideo.src = url
            changeSpeed(myVideo, videoSpeed.value)

            videoStart.max = myVideo.duration
            videoEnd.max = myVideo.duration
        } else if (videoUpload.files[0].type.includes("image")) {
            myVideo.hidden = true
            myImage.hidden = false

            myImage.src = url
        }
        reset_crop()
        showCards = true

        videoContentCard.hidden = !showCards
        cropVideoCard.hidden = !showCards
        previewFrameCard.hidden = !showCards
    } else if (videoUpload.files.length > 1) {
        for (let i = 0; i < videoUpload.files.length; i++) {
            f = videoUpload.files[i]
            url = (URL || webkitURL).createObjectURL(f)
            if (f.type.includes("video")) {
                $( "<video>", {
                    "playbackRate": videoSpeed.value,
                    text: "Click me!",
                    src: url
                })
                .appendTo( "body" );


                myImage.hidden = true
                myVideo.hidden = false
                myVideo.src = url
                
                // hide these?
                videoStart.max = myVideo.duration
                videoEnd.max = myVideo.duration
            } else if (f.type.includes("image")) {
                max_chars = 120
                if (f.name.length > max_chars) {
                    fname = f.name.slice(0, max_chars - 3) + "..."
                } else {
                    fname = f.name
                }

                $('.grid').append(
                    $.el('div', {'class': 'card is-draggable'}).append(
                        $.el('header', {'class': 'card-header'}).append(
                            $.el('p', {'class': 'card-header-title', 'title': f.name}).text(fname)
                        )
                    )
                    .append(
                        $.el('div', {'class': 'card-body'}).append(
                            $.el('img', {"src": url, "data-img-file-index": imgFiles.length})
                        )
                    )
                );
                imgFiles.push(f);
            }
        }
    } else {
        videoContentCard.hidden = true;
        cropVideoCard.hidden = true;
        previewFrameCard.hidden = true;
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
    console.log("canplay")
    if (myVideo.videoWidth * myVideo.videoHeight > 1920 * 1080) {
        videoUpload.value = ""
        myVideo.hidden = true
        changeVisualAreaSize()
        alert("Video resolution too high please select another file, 1080p max")
        changeVisualAreaSize()
        return
    }
    videoRight = myVideo.videoWidth
    videoBottom = myVideo.videoHeight
}

myVideo.onloadeddata = function(e) {
    draw_video_frame()
    changeVisualAreaSize()
}

myImage.onload = function(e) {
    if (myImage.naturalWidth * myImage.naturalHeight > 1920 * 1080) {
        videoUpload.value = ""
        myImage.hidden = true
        changeVisualAreaSize()
        alert("Image resolution too high please select another file, max 1920x1080 (or 1080x1920)")
        changeVisualAreaSize()
        return
    }
    changeVisualAreaSize()
    reset_crop()
}

function changeVisualAreaSize() {
    return
    console.log("Loaded video")
    currentTab = myVideo.closest('#tab')
    currentTab.classList.remove("expandable", "minimised")
    currentTab.classList.add("capsule")

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

    e = myAudio.closest('.card').hidden = false
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

function audioChange(t) {
    console.log("New audio")
    inputDisplayName(t)
    if (audioUpload.files.length == 1) {
        fileBlob = audioUpload.files[0]
        url = (URL || webkitURL).createObjectURL(fileBlob)

        myAudio.src = url
    } else {
        myAudio.src = ""
    }
    setMaxMediaValues()
    changeAudioAreaSize()
    audioSourceChange("audio")
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

function draw_video_frame() {
    visualType = getVisualType()
    if (visualType == "video") {
        visualMedia = myVideo
        visualHeight = myVideo.videoHeight
        visualWidth = myVideo.videoWidth
    } else if (visualType == "image") {
        visualMedia = myImage
        visualHeight = myImage.naturalHeight
        visualWidth = myImage.naturalWidth
    } else {
        return false
    }

    canvas.width = visualWidth
    canvas.height = visualHeight

    ctx.globalAlpha = 1
    ctx.drawImage(visualMedia, 0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.5
    // Top bar
    ctx.fillRect(0, 0, visualWidth, videoTop)
    // Bottom bar
    ctx.fillRect(0, videoBottom, visualWidth, visualHeight - videoBottom)
    // Left
    ctx.fillRect(0, videoTop, videoLeft, videoBottom - videoTop)
    // Right
    ctx.fillRect(videoRight, videoTop, visualWidth - videoRight, videoBottom - videoTop)

}

myVideo.onplay = (e) => {
    function loop() {
        if (!myVideo.paused && !myVideo.ended) {
            draw_video_frame()
            setTimeout(loop, 1000 / 30) // drawing at 30fps
        }
    }
    loop()
}

myVideo.onvolumechange = (e) => {
    if (myVideo.muted) {
        document.getElementById("mutevideo").dataset.state = "mute"
    } else {
        document.getElementById("mutevideo").dataset.state = "sound"
    }
}


crop_timer = null
mousedown = false
canvas.onmousedown = (e) => {
    mousedown = true
    pos = getCursorPosition(canvas, e)
    croping_video(pos, e.shiftKey, e.ctrlKey)
}

canvas.onmouseup = (e) => {
    mousedown = false
}

canvas.onmouseleave = (e) => {
    mousedown = false
}

canvas.onmousemove = (e) => {
    if (mousedown) {
        pos = getCursorPosition(canvas, e)
        croping_video(pos, e.shiftKey, e.ctrlKey)
    }
}

function clear_crop() {
    if (crop_timer !== null) {
        clearInterval(crop_timer)
        crop_timer = null
    }
}

document.addEventListener('mouseup', clear_crop)
document.addEventListener('mouseout', clear_crop)

function getCursorPosition(c, event) {
    const rect = c.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    console.log("x: " + x + " y: " + y)
    return [x/canvas.offsetWidth * canvas.width, y/canvas.offsetHeight * canvas.height]
}

function round_even(n) {
    n = Math.round(n)
    if (n % 2 == 0) {
        // Even
        return n
    } else {
        // Odd
        return n - 1
    }
}

function reset_crop() {
    videoTop = 0
    videoLeft = 0
    if (getVisualType() == "video") {
        videoBottom = round_even(myVideo.videoHeight)
        videoRight = round_even(myVideo.videoWidth)
    } else {
        videoBottom = round_even(myImage.naturalHeight)
        videoRight = round_even(myImage.naturalWidth)
    }

    draw_video_frame()
}

function croping_video(pos, maintain_ratio=false, sixteen_by_nine=false) {
    visualType = getVisualType()
    if (visualType == "video") {
        visualHeight = myVideo.videoHeight
        visualWidth = myVideo.videoWidth
    } else {
        visualHeight = myImage.naturalHeight
        visualWidth = myImage.naturalWidth
    }

    // Find closest corner
    corners = [[videoLeft, videoTop], [videoRight, videoTop], [videoLeft, videoBottom], [videoRight, videoBottom]]

    function d_squrared(a, b) {
        return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
    }

    distance = []

    pos = [round_even(pos[0]), round_even(pos[1])]

    corners.forEach(corner => {
        dis = d_squrared(corner, pos)
        distance.push(dis)
    })

    minIndex = distance.indexOf(Math.min(...distance))
    if (maintain_ratio) {
        aspect = visualWidth / visualHeight
    } else if (sixteen_by_nine) {
        maintain_ratio = true
        aspect = 16 / 9
    }
    if (minIndex == 0) {
        if (maintain_ratio) {
            videoLeft = pos[0]
            videoTop = Math.max(0, Math.min(visualHeight - 1, -((videoRight - videoLeft) / aspect - videoBottom)))
        } else {
            videoLeft = pos[0]
            videoTop = pos[1]
        }
    } else if (minIndex == 1) {
        if (maintain_ratio) {
            videoRight = pos[0]
            videoTop = Math.max(0, Math.min(visualHeight - 1, -((videoRight - videoLeft) / aspect - videoBottom)))
        } else {
            videoRight = pos[0]
            videoTop = pos[1]
        }
    } else if (minIndex == 2) {
        if (maintain_ratio) {
            videoLeft = pos[0]
            videoBottom = Math.max(0, Math.min(visualHeight - 1, (videoRight - videoLeft) / aspect + videoTop))
        } else {
            videoLeft = pos[0]
            videoBottom = pos[1]
        }
    } else if (minIndex == 3) {
        if (maintain_ratio) {
            videoRight = pos[0]
            videoBottom = Math.max(0, Math.min(visualHeight - 1, (videoRight - videoLeft) / aspect + videoTop))
        } else {
            videoRight = pos[0]
            videoBottom = pos[1]
        }
    } else {
        console.log("NOPE")
    }
    videoTop = round_even(videoTop)
    videoLeft = round_even(videoLeft)
    videoBottom = round_even(videoBottom)
    videoRight = round_even(videoRight)

    if (visualType == "image" || myVideo.paused || myVideo.ended) {
        draw_video_frame()
    }
}

function textAreaAdjust(t) {
    t.style.height = "";
    t.style.height = t.scrollHeight + "px"
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
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
  
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

function captureVideo(video) {
    var c = document.createElement("canvas")
    var ctx = c.getContext("2d")
    c.width = video.videoWidth
    c.height = video.videoHeight

    ctx.drawImage(video, 0, 0)
    return c.toDataURL('image/png')
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
                upper = getAudioSource().duration
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
            lower = getAudioSource().duration
        } else {
            lower = cols[1].children[0].value
        }

        // currentTime between start and stop times
        if (lower <= getAudioSource().currentTime && getAudioSource().currentTime < upper) {
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
        'shady': shady,
        "videoTop": videoTop,
        "videoLeft": videoLeft,
        "videoBottom": videoBottom,
        "videoRight": videoRight
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
    console.log("Start: " + getAudioSource().currentTime)
    start_times.push(getAudioSource().currentTime)

    if (lastFocus == null) {
        lastFocus = document.getElementById("start_0")
    }
    if (lastFocus.id.startsWith("stop")) {
        lastFocus = document.getElementById(
            "start_" + (parseInt(lastFocus.id.split("_")[1]) + 1)
        ) // this may be an issue
    }

    lastFocus.value = getAudioSource().currentTime.toFixed(2)
    focusOnNoScoll(
        document.getElementById(
            "stop_" + parseInt(lastFocus.id.split("_")[1])
        )
    )
}

function time_stop() {
    console.log("Stop: " + getAudioSource().currentTime)
    stop_times.push(getAudioSource().currentTime)

    if (lastFocus == null) {
        lastFocus = document.getElementById("start_0")
    }
    if (lastFocus.id.startsWith("start")) {
        lastFocus = document.getElementById(
            "stop_" + lastFocus.id.split("_")[1]
        ) // this may be an issue
    }

    lastFocus.value = getAudioSource().currentTime.toFixed(2)

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
    console.log("Set overflow?")
    // t.closest(".expandable").style.overflow = value
}

// Lyrics textarea has been updated
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
        var $table = $('table.frozenHead');
        $table.floatThead('destroy');
        // tableText is text settings table
        document.getElementById("tableText").closest(".card").hidden = true
        // tableText is text settings table
        document.getElementById("table1").closest(".card-content").classList.add("is-hidden")
        deleteCookie("lyricsArea")
        e = tbl.closest('div')
    } else {
        var $table = $('table.frozenHead');
        $table.floatThead('destroy');
        document.getElementById("tableText").closest(".card").hidden = false
        document.getElementById("table1").closest(".card-content").classList.remove("is-hidden")
        document.getElementById("text_tl").required = true
        if (document.getElementById("verses").checked) {
            lines = lyrics.value.split("\n\n")
        } else {
            lines = lyrics.value.split("\n")
        }
        console.log(lines)
        output_tbl =
            "<thead><tr><th><div align='left' class='is-inline' style='vertical-align:middle;'>Line</div><div class='is-inline'></div>" +
            "<div align='right' class='is-inline' style='float: right;'><button onclick='playAudio(this)' class='button'>Play Audio</button></div></th>" +
            '<th><button onclick="time_start()" class="button">Start</button></th>' +
            '<th><button onclick="time_stop()" class="button">Stop</button></th></tr></thead>'

        start_times = []
        stop_times = []
        if (tableLength > 0) {
            for (let i = 0; i < tableLength; i++) {
                start_times.push(document.getElementById("start_" + i).value)
                stop_times.push(document.getElementById("stop_" + i).value)
            }
        }

        i = 0
        lines.forEach((line) => {
            output_tbl +=
                "<tr><td style='width: 100%;'>" +
                line.replace(/\n/g, "<br>") +
                '</td><td> <input type="number" id="start_' +
                i +
                '" min="0" step="0.01" onfocus="numLostFocus(start_' +
                i +
                ')" onchange="setCookie(this)" class="hide-arrows"> </td><td> <input type="number" id="stop_' +
                i +
                '" min="0" step="0.01" onfocus="numLostFocus(stop_' +
                i +
                ')" onchange="setCookie(this)" class="hide-arrows"> </td></tr>'

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
        var $table = $('table.frozenHead');
        $table.floatThead({
            position: 'absolute'
        });
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

    audioDuration = getOutputAudioDuration(content)

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
        if (getAudioSource(null) == null) {
            dur = 1000000
        } else {
            dur = getAudioSource().duration.toFixed(2)
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

function getOutputAudioDuration() {
    content = getAudioSource()

    audioStartTime = document.getElementById("audio_start").value
    if (audioEnd.value == 0) {
        audioEndTime = content.duration
    } else {
        audioEndTime = audioEnd.value
    }
    return (audioEndTime - audioStartTime) / audioSpeed.value
}

function getOutputVideoDuration() {
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

function getOutputDuration() {
    audioDuration = getOutputAudioDuration()
    if (getVisualType() != "video") {
        return audioDuration
    }
    videoDuration = getOutputVideoDuration()

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
            } else if (parseFloat(start_elm.value) > getAudioSource().duration) {
                showElementError(start_elm, "Must be less than than " + getAudioSource().duration)
                return false
            } else if (parseFloat(stop_elm.value) > getAudioSource().duration) {
                showElementError(stop_elm, "Must be less than than " + getAudioSource().duration)
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
    console.log("fetched")
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

    // Check media has a duration
    // Video
    if (getRadioValue("visualType") == "video") {
        videoStartTime = parseFloat(document.getElementById("video_start").value)
        videoEndTime = parseFloat(document.getElementById("video_end").value)
        
        // Start out of range
        if (videoStartTime < 0 || videoStartTime > myVideo.duration) {
            showElementError(document.getElementById("video_start"), "Please check video timings and try again")
            return false
        }

        // End is not 0 so must be less than video length and video_start
        if (videoEndTime != 0 && (videoStartTime >= videoEndTime || videoEndTime >= myVideo.duration || videoEndTime < 0)) {
            showElementError(document.getElementById("video_end"), "Please check video timings and try again")
            return false
        }
    }
    
    // Audio
    myMedia = getAudioSource()
    audioStartTime = parseFloat(document.getElementById("audio_start").value)
    audioEndTime = parseFloat(document.getElementById("audio_end").value)
    
    // Start out of range
    if (audioStartTime < 0 || audioStartTime > myMedia.duration) {
        showElementError(document.getElementById("audio_start"), "Please check audio timings and try again")
        return false
    }

    // End is not 0 so must be less than audio length and audio_start
    if (audioEndTime != 0 && (audioStartTime >= audioEndTime || audioEndTime >= myMedia.duration || audioEndTime < 0)) {
        showElementError(document.getElementById("audio_end"), "Please check audio timings and try again")
        return false
    }
    // END

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

    if (audioSize + videoSize > 10 * (10**9)) {
        alert("Unable to upload, combined filesize must be below 10GB")
        return false
    } else if (audioSize + videoSize > 1 * (10**9) && !confirm("This may take a while depending on your internet connection, do you want to continue?")) {
        return false
    } else {
        return true
    }
}

function checkDuration() {
    // Check file length
    duration = getOutputDuration()

    if (duration > 600) {
        alert("Max video length 10 minutes (after applying speed change)")
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
        } else if (audioUpload.files.length == 0 && getRadioValue("audioSource") == "audio") {
            showElementError(audioUpload, "Please upload an audio file or select 'Video' as the audio source")
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

    //document.getElementById("submitbutton").classList.add("is-loading")

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
        document.getElementById("videoTop").value = Math.round(videoTop)
        document.getElementById("videoLeft").value = Math.round(videoLeft)
        document.getElementById("videoBottom").value = Math.round(videoBottom)
        document.getElementById("videoRight").value = Math.round(videoRight)
        document.getElementById("uuid").value = video_id
        document.getElementById("submitbutton").innerHTML = "Submitting Form Data..."
        document.getElementById("theform").submit()
    } else {
        console.log("Failed to submit")
        document.getElementById("submitbutton").classList.remove("is-loading")
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

function hide_canvas(e) {
    draw_video_frame()
    hide(e)
}

function update_highlight() {
    // Do highlighting
    var rows = tbl.getElementsByTagName('tr')
    var upper
    for (var i = 1; i < rows.length; i++) {
        row = rows[i]
        cols = row.getElementsByTagName('td')

        // Stop value not there
        if (cols[2].children[0].value == "") {
            if (rows.length == i + 1) {
                upper = getAudioSource().duration
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
            lower = getAudioSource().duration
        } else {
            lower = cols[1].children[0].value
        }

        // currentTime between start and stop times
        if (lower < getAudioSource().currentTime && getAudioSource().currentTime < upper) {
            row.classList.add("is-selected")
        } else {
            row.classList.remove("is-selected")
        }
    }
}

myVideo.ontimeupdate = (e) => {
    // do table highlighting
    update_highlight()
}

myAudio.ontimeupdate = (e) => {
    update_highlight()
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
    if (newType == "image") {
        videoUpload.multiple = "multiple"
    } else {
        videoUpload.multiple = ""
    }
    audioFitTime()
    tableElements = document.getElementById("tableVisual").getElementsByClassName('is-all-setting')
    newClass = "is-" + newType + "-setting"
    for (let i = 0; i < tableElements.length; i++) {
        tableElements[i].hidden = !tableElements[i].className.includes(newClass)
    }

    if (videoUpload.files.length == 0) {
        filetype = ""
    } else {
        filetype = videoUpload.files[0].type
    }

    if (newClass == "is-solid-setting" || !filetype.includes(newClass)) {
        // REMINDER: hide the video element?
    } else {
        // REMINDER: show the video element?
        displayElements = myVideo.closest(".card").getElementsByClassName("is-all-setting")
        for (let i = 0; i < displayElements.length; i++) {
            if (!displayElements[i].hidden) {
                displayElements[i].hidden = !displayElements[i].className.includes(newClass)
            }
        }
    }
    document.getElementById("tableVisual").parentElement.style = "--extendedHeight: " + document.getElementById("tableVisual").offsetHeight + "px;"
}

function advancedOption() {
    if (document.getElementById("advanced_options").checked) {
        audioSourceChange("advanced_audio")
        audioUpload.closest("tr").hidden = true
    } else {
        audioSourceChange("video")
    }
}

function audioSourceChange(newSource) {
    console.log(newSource)
    newClass = "is-" + newSource + "-setting"
    elements = document.getElementById("tableAudio").getElementsByClassName('is-all-setting')
    for (let i = 0; i < elements.length; i++) {
        elements[i].hidden = !elements[i].className.includes(newClass)
    }
    myAudio.closest(".card").hidden = (getRadioValue("audioSource") == "video") || (audioUpload.files.length == 0)
    if ((getRadioValue("audioSource") == "video") || (audioUpload.files.length == 0)) {
        myAudio.pause()
    }
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

document.addEventListener('keydown', function (e) {
    if (document.activeElement.id.startsWith("start") || document.activeElement.id.startsWith("stop")) {
        if (e.code === 'KeyQ') {
            time_start()
        } else if (e.code === 'KeyW') {
            time_stop()
        }
    }
})

function setIntervalX(callback, delay, repetitions) {
    var x = 0;
    var intervalID = window.setInterval(function () {

       callback();

       if (++x === repetitions) {
           window.clearInterval(intervalID);
       }
    }, delay);
}

function playAudio(t) {
    audio = getAudioSource()
    
    // check if there is a source
    if (!audio.closest(".card").hidden) {
        // pause or play it and update button text
        // update button
        if (audio.paused) {
            audio.play()
            t.innerHTML = "Pause Audio"
        } else {
            audio.pause()
            t.innerHTML = "Play Audio"
        }
    }
    return
}

myVideo.oncanplaythrough = function () {
    setIntervalX(draw_video_frame, 100, 50);
}

document.addEventListener('DOMContentLoaded', function () {
    loadFromCookies()
    textAreaAdjust(lyrics)
    getID()
    cookieDisplay()
    var $table = $('table.frozenHead');
    $table.floatThead({
        position: 'absolute'
    });

    let cardToggles = document.getElementsByClassName('card-toggle');
    for (let i = 0; i < cardToggles.length; i++) {
      cardToggles[i].addEventListener('click', e => {
        e.currentTarget.parentElement.parentElement.childNodes[3].classList.toggle('is-hidden');
      });
    }

    // Draggable tiles
    dragula([document.querySelector(".grid")], {
        revertOnSpill: true
    })      
}, false)