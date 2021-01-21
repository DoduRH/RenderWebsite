
function deleteCookie(cname) {
var name = cname + "="
var decodedCookie = decodeURIComponent(document.cookie)
var ca = decodedCookie.split(';')
for (var i = 0; i < ca.length; i++) {
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

function deleteTimingInfo() {
regStart = /(start_[0-9]|stop_[0-9])/g
while ((match = regStart.exec(document.cookie)) != null) {
    deleteCookie(match[0])
}
deleteCookie("lyricsArea")
}

function progressBar(target) {
var elem = document.getElementById("progBar")
elem.value = target
}

function request() {
console.log("starting request...")
fetch('/get_file?videoID='.concat(video_id))
    .then(response => response.json())
    .then(data => {
    console.log(data['status'])
    if (data['status'] == "error") {
        document.getElementById("head").innerHTML = "Something went wrong, sorry for the inconvenience"
        document.getElementById("errorMsg").innerHTML = "Error message: " + data['error']
        document.getElementById("errorMsg").hidden = false
        document.getElementById("quote").innerHTML = document.getElementById("quote").innerHTML.replace('Any problems, p', 'P')
        clearInterval(timerID)
    } else {
        progressBar(data['progress'])
        if (data['progress'] == "100") {
        clearInterval(timerID)
        window.location.href = "/download?videoID=".concat(video_id)
        document.title = "Your download should begin shortly"
        document.getElementById("head").innerHTML = "You download should begin shortly"
        document.getElementById("new_vid_link").target = ""
        }
    }
    })
    .catch((error) => {
    console.error('Error:', error);
    });
}
errored = false
video_id = new URLSearchParams(window.location.search).get("videoID")
deleteTimingInfo()
timerID = setInterval(request, 5000)
request()
