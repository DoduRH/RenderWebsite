# Add My Lyrics

Add my lyrics is a website to quickly and easily add accurately timed lyrics to videos.  The deployed website can be found [here](https://addmylyrics.com).  [Ffmpeg WASM](https://github.com/ffmpegwasm/ffmpeg.wasm) is used to render the video in the web browser.

## Running locally

Under normal running conditions data is logged to Google firestore.  When running locally this step will be skipped (if there is no Google authorisation json).

`Website/requirements.txt` has the full list of modules required to run the website. Python 3.9 was used in development.

## How to use

For a complete how-to guide for the site click [here](https://addmylyrics.com/how-to).

## Video Rendering

The `Render` folder contains the server that renders the videos.  This is no longer needed as the rendering is now done on the client using ffmpeg-WASM.  In older versions of the website however the rendering engine sat behind a task queue to buffer incoming render tasks.