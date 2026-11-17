# X launch kit

- `POSTS.md` — bio, every post with its caption, placeholders and a posting schedule.
- `out/` — ready-to-upload images and videos (generated).
- `make.py` — regenerates everything: `python marketing/x/make.py` (needs Pillow and imageio-ffmpeg).
- `src/` — app screenshots used by the generator. Recreate them with the renderer preview
  (`node dev/serve.js`) and `dev/shot.sh "http://localhost:5178/?album" marketing/x/src/app-album.png 1280 800 2`
  (also `?lyrics`, `?get-link`, `?get-sources`, `?get-queue`, `?home`, `?library`, `?rooms`).
