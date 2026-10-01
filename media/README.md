# media/ — your raw footage goes here

Upload exactly these two files (GitHub → Add file → Upload files, on branch `arena/01a0d958-shivaa-ecom`):

| file | what |
|---|---|
| `webcam.mp4` | your talking-head video. **Its audio is the master timeline** — speak the whole script here, including while you demo. |
| `screen.mp4` | the screen recording of the platform. No audio needed. |

Tips for the best cut:
- Record the webcam in one continuous take, 1080p if possible.
- Say the intro (~8 s), then narrate the demo, then the closing CTA (~8 s).
- In the screen recording, move slowly and pause 1–2 s on each key screen.
- Browser upload caps at 25 MB/file — if bigger, compress first:
  `ffmpeg -i in.mp4 -vf scale=-2:1080 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k out.mp4`

---

## Bhejne se pehle compress zaroor karein (sandbox ke bahar se download block hai)

```bash
ffmpeg -i webcam.mp4 -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k webcam.mp4.small.mp4
ffmpeg -i screen.mp4 -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 28 -preset slow -an screen.mp4.small.mp4
```
- < 25 MB  → GitHub web "Add file → Upload files" into `media/`
- 25–100 MB → desktop `git push origin arena/01a0d958-shivaa-ecom`
- > 100 MB → split into 24 MB parts (7-Zip volumes or `split -b 24m file part.`), upload the parts; they get rejoined here.

Render ho jaane ke baad ye raw files repo se hata di jayengi taaki repo halka rahe.
