const readFromBlobOrFile = (blob) => (
    new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = ({ target: { error: { code } } }) => {
        reject(Error(`File could not be read! Code=${code}`));
      };
      fileReader.readAsArrayBuffer(blob);
    })
  );
  
  const parseArgs = (Core, args) => {
    const argsPtr = Core._malloc(args.length * Uint32Array.BYTES_PER_ELEMENT);
    args.forEach((s, idx) => {
      const buf = Core._malloc(s.length + 1);
      Core.writeAsciiToMemory(s, buf);
      Core.setValue(argsPtr + (Uint32Array.BYTES_PER_ELEMENT * idx), buf, 'i32');
    });
    return [args.length, argsPtr];
  };
  
  const ffmpeg = (Core, args) => {
    Core.ccall(
      'proxy_main',
      'number',
      ['number', 'number'],
      parseArgs(Core, ['ffmpeg', '-nostdin', ...args]),
    );
  };
  
  const runFFmpeg = async (files, args, ofilename, progress_bar) => {
    let resolve = null;
    let file = null;
    console.log(`Running ${args.join(" ")}`)
    Core = await createFFmpegCore({
      printErr: (m) => {
        console.log(m);

        if (/,([ \d]*) fps,/gm.exec(m) !== null) {
          // Get fps
          output_fps = parseFloat(/,([ \d]*) fps,/gm.exec(m)[1])

          duration = getOutputDuration();
          totalFrames = Math.round(duration * output_fps)
        }

        // Update the text
        const regex = /frame=([ \d]*) fps=([ \d]*).*speed= *(\d*.\d*)x/gm;
        bits = regex.exec(m)

        frame = parseInt(bits[1]);
        //render_fps = parseFloat(bits[2]);
        //speed = parseFloat(bits[3]);

        progress_bar.value = (frame/totalFrames) * 100
        //message.innerHTML = `Rendering frame ${frame} of ${totalFrames} at ${render_fps} frames per second`
      },
      print: (m) => {
        console.log(m);

        if (m.startsWith('FFMPEG_END')) {
          console.log("Resolving core object")

          resolve();
        }
      },
    })
    // extraFiles.forEach(({ name, data: d }) => {
    //   Core.FS.writeFile(name, d);
    // });
    for (const [key, value] of Object.entries(files)) {
      Core.FS.writeFile(key, value);
    }
    
    ffmpeg(Core, args);
    await new Promise((_resolve) => { resolve = _resolve });
    if (typeof ofilename !== 'undefined') {
      file = Core.FS.readFile(ofilename);
      Core.FS.unlink(ofilename);
    }
    return { Core, file };
  };
  
  const b64ToUint8Array = (str) => (Uint8Array.from(atob(str), c => c.charCodeAt(0)));
  