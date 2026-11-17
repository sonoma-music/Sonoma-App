"""Generates the X (Twitter) launch kit for Sonoma: avatar, banner, post images and demo videos.

Usage:  python marketing/x/make.py            (all)
        python marketing/x/make.py images     (only images)
        python marketing/x/make.py videos     (only videos)
Needs: Pillow, imageio-ffmpeg. App screenshots come from marketing/x/src (see README there).
Edit TICKER / CHAIN / SITE below; the contract address is NOT baked into images on purpose.
"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

TICKER = '$SONOMA'
CHAIN = 'Robinhood Chain'
SITE = 'trysonoma.xyz'
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, 'out')
ICON = os.path.join(HERE, '..', '..', 'build', 'icon.png')
os.makedirs(OUT, exist_ok=True)

F = r'C:\Windows\Fonts'
def font(size, w='bold'):
    name = {'bold': 'segoeuib.ttf', 'semi': 'seguisb.ttf', 'reg': 'segoeui.ttf', 'light': 'segoeuil.ttf', 'mono': 'consola.ttf'}[w]
    path = os.path.join(F, name)
    if not os.path.exists(path): path = os.path.join(F, 'segoeui.ttf')
    return ImageFont.truetype(path, size)

INK = (238, 241, 251); MUTED = (163, 170, 192); CYAN = (151, 230, 255); BLUE = (10, 92, 255); BG = (4, 5, 7)

# ---------------------------------------------------------------- helpers
def background(w, h, glow=1.0, seed=0.0):
    """Black canvas with the site's blue glow (two soft radial blobs)."""
    small = Image.new('RGB', (w // 8, h // 8), BG)
    px = small.load(); sw, sh = small.size
    cx1, cy1 = sw * (0.15 + 0.05 * math.sin(seed)), sh * (-0.05)
    cx2, cy2 = sw * (0.9 - 0.05 * math.cos(seed * .8)), sh * 1.05
    for y in range(sh):
        for x in range(sw):
            d1 = math.hypot((x - cx1) / (sw * .55), (y - cy1) / (sh * .9))
            d2 = math.hypot((x - cx2) / (sw * .5), (y - cy2) / (sh * .8))
            a = max(0, 1 - d1) ** 2 * 0.75 * glow + max(0, 1 - d2) ** 2 * 0.55 * glow
            px[x, y] = (int(4 + 20 * a), int(5 + 80 * a), int(7 + 235 * a))
    return small.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))

def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    out = Image.new('RGBA', im.size); out.paste(im, (0, 0), m); return out

def shadowed(base, im, xy, r=18, blur=40, alpha=170):
    sh = Image.new('RGBA', (im.width + blur * 4, im.height + blur * 4), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([blur * 2, blur * 2 + 20, blur * 2 + im.width, blur * 2 + im.height + 20], r, fill=(0, 0, 0, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(sh, (xy[0] - blur * 2, xy[1] - blur * 2))
    base.alpha_composite(rounded(im.convert('RGBA'), r), xy)

def text(d, xy, s, f, fill=INK, anchor='la', spacing=8):
    d.multiline_text(xy, s, font=f, fill=fill, anchor=anchor, spacing=spacing)

def logo(size):
    return Image.open(ICON).convert('RGBA').resize((size, size), Image.LANCZOS)

def mark(d, x, y, s=1.0, fill=INK):
    """The three-bar Sonoma mark drawn as vector."""
    for bx, by, bw, bh in [(5, 14, 7, 16), (16.5, 6, 7, 28), (28, 11, 7, 13)]:
        d.rounded_rectangle([x + bx * s, y + by * s, x + (bx + bw) * s, y + (by + bh) * s], 3.5 * s, fill=fill)

def pill(d, xy, s, f, bg=CYAN, fg=(16, 22, 56), pad=(22, 10)):
    l, t, r, b = d.textbbox((0, 0), s, font=f)
    w, h = r - l + pad[0] * 2, b - t + pad[1] * 2
    d.rounded_rectangle([xy[0], xy[1], xy[0] + w, xy[1] + h], h // 2, fill=bg)
    d.text((xy[0] + pad[0] - l, xy[1] + pad[1] - t), s, font=f, fill=fg)
    return w, h

def shot(name, width):
    im = Image.open(os.path.join(SRC, f'app-{name}.png')).convert('RGB')
    return im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)

# ---------------------------------------------------------------- profile & banner
def make_avatar():
    logo(400).convert('RGB').save(os.path.join(OUT, 'profile-400.png'))

def make_banner():
    W, H = 1500, 500
    im = background(W, H, 1.1).convert('RGBA'); d = ImageDraw.Draw(im)
    app = shot('album', 760)
    shadowed(im, app, (W - 760 - 70, 120), r=14)
    mark(d, 80, 150, 2.0)
    text(d, (180, 150), 'Sonoma', font(64))
    text(d, (82, 250), 'Your music, lyrics and friends\nin one player.', font(40, 'semi'), spacing=10)
    pill(d, (82, 375), 'Free · Open source · ' + SITE, font(22, 'semi'))
    im.convert('RGB').save(os.path.join(OUT, 'banner-1500x500.png'))

# ---------------------------------------------------------------- post images (1600x900)
def card(name, kicker, title, sub, app, foot=None, glow=1.0):
    W, H = 1600, 900
    im = background(W, H, glow).convert('RGBA'); d = ImageDraw.Draw(im)
    mark(d, 90, 80, 1.3); text(d, (150, 86), 'Sonoma', font(34, 'semi'))
    pill(d, (90, 190), kicker, font(22, 'semi'), bg=(38, 44, 58), fg=INK, pad=(16, 8))
    text(d, (90, 260), title, font(62), spacing=12)
    tb = d.multiline_textbbox((90, 260), title, font=font(62), spacing=12)
    text(d, (92, tb[3] + 26), sub, font(28, 'reg'), fill=MUTED, spacing=10)
    if app:
        s = shot(app, 860)
        shadowed(im, s, (W - 860 - 60, (H - s.height) // 2 + 20), r=16)
    text(d, (90, H - 90), foot or f'{SITE}  ·  Windows & Linux  ·  MIT licence', font(24, 'semi'), fill=CYAN)
    im.convert('RGB').save(os.path.join(OUT, name))

def make_post_images():
    card('post-img-1-free-open-source.png', 'OPEN SOURCE · MIT', 'Free. Forever.\nOpen source.', 'No ads. No account. No paid plans.\nEvery line of code on GitHub.', 'album')
    card('post-img-2-word-synced-lyrics.png', 'LYRICS', 'Lyrics that light up\nword by word.', 'Local .lrc first, LRCLIB when missing.\nClick a line to jump there.', 'lyrics')
    card('post-img-3-get-music.png', 'GET MUSIC', 'Build a lossless\nlibrary. Legally.', 'Paste any link. Buy the FLAC or grab\nfree, legal copies. Tags done for you.', 'get-link')
    card('post-img-4-listen-together.png', 'LISTENING ROOMS', 'Same song.\nSame second.', 'Host a room, share the code, chat\nwhile you listen. Self-host the server.', 'rooms')

def big_card(name, kicker, title, sub, badge=None, glow=1.2, fire=False):
    W, H = 1600, 900
    im = background(W, H, glow).convert('RGBA'); d = ImageDraw.Draw(im)
    if fire:  # warm glow at the bottom for the burn posts
        warm = Image.new('RGBA', (W, H), (0, 0, 0, 0)); wd = ImageDraw.Draw(warm)
        for i in range(40):
            r = 900 - i * 18; a = int(2 + i * 1.6)
            wd.ellipse([W / 2 - r * 1.4, H + 120 - r * .55, W / 2 + r * 1.4, H + 120 + r * .55], fill=(255, 90, 30, a))
        im.alpha_composite(warm.filter(ImageFilter.GaussianBlur(30)))
    mark(d, W / 2 - 160, 90, 1.3); text(d, (W / 2 - 100, 96), 'Sonoma', font(34, 'semi'))
    pill_w = d.textbbox((0, 0), kicker, font=font(22, 'semi'))[2] + 32
    pill(d, (W / 2 - pill_w / 2, 200), kicker, font(22, 'semi'), bg=(38, 44, 58), fg=INK, pad=(16, 8))
    text(d, (W / 2, 290), title, font(104), anchor='ma', spacing=14)
    tb = d.multiline_textbbox((W / 2, 290), title, font=font(104), anchor='ma', spacing=14)
    text(d, (W / 2, tb[3] + 34), sub, font(32, 'reg'), fill=MUTED, anchor='ma', spacing=12)
    if badge:
        bw = d.textbbox((0, 0), badge, font=font(26, 'semi'))[2] + 48
        pill(d, (W / 2 - bw / 2, H - 150), badge, font(26, 'semi'), pad=(24, 12))
    im.convert('RGB').save(os.path.join(OUT, name))

def make_burn_and_launch():
    big_card('burn-1-announcement.png', 'DEV ALLOCATION', '100% burned.', f'Every {TICKER} token held by the dev wallet\nhas been sent to the dead address.', 'Proof on-chain · link in post', fire=True)
    big_card('burn-2-proof.png', 'PROOF', 'Check the TX.', 'Burn transaction and dead address are public.\nDon\'t trust. Verify on the explorer.', 'Explorer link in post', fire=True)
    big_card('burn-3-why.png', 'WHY WE BURNED', 'No dev bags.', 'Sonoma is a free, open-source app.\nThe token belongs to the community.', SITE, fire=True)
    big_card('burn-4-recap.png', 'RECAP', 'Burned. Verified.\nBuilding.', 'Dev wallet: 0 tokens left.\nNext: more features in the app.', SITE, fire=True)
    big_card('launch-before-1-soon.png', CHAIN.upper(), f'{TICKER}\nis coming.', 'The community token of Sonoma,\nthe free, open-source music player.', 'CA only on ' + SITE + ' and this account')
    big_card('launch-before-2-countdown.png', 'LAUNCH DAY', 'Tomorrow.', f'{TICKER} goes live on {CHAIN}.\nCA will be posted here first.', 'Turn on notifications')
    big_card('launch-after-1-live.png', 'NOW LIVE', f'{TICKER}\nis live.', f'Live on {CHAIN}. Copy the CA from\n{SITE} or the pinned post. Nowhere else.', 'Verify before you buy')
    big_card('launch-after-2-thanks.png', 'THANK YOU', 'Day one. Done.', 'Thanks for showing up.\nThe app keeps shipping: free and open source.', SITE)

# ---------------------------------------------------------------- videos (1280x720, 30 fps)
FPS, VW, VH = 30, 1280, 720
ease = lambda t: 1 - (1 - min(max(t, 0), 1)) ** 3

class Scene:
    def __init__(self, dur, draw): self.dur, self.draw = dur, draw

def s_title(title, sub=None, kicker=None):
    bgs = {}
    def draw(t, dur):
        k = int(t * 2)
        if k not in bgs: bgs.clear(); bgs[k] = background(VW, VH, 1.0 + 0.15 * math.sin(t), seed=t).convert('RGBA')
        im = bgs[k].copy(); d = ImageDraw.Draw(im)
        a = ease(t / 0.6); dy = int(30 * (1 - a))
        layer = Image.new('RGBA', (VW, VH), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
        if kicker:
            kw = ld.textbbox((0, 0), kicker, font=font(20, 'semi'))[2] + 32
            pill(ld, (VW / 2 - kw / 2, 200 + dy), kicker, font(20, 'semi'), bg=(38, 44, 58), fg=INK, pad=(16, 7))
        text(ld, (VW / 2, 260 + dy), title, font(70), anchor='ma', spacing=10)
        if sub:
            tb = ld.multiline_textbbox((VW / 2, 260 + dy), title, font=font(70), anchor='ma', spacing=10)
            text(ld, (VW / 2, tb[3] + 26), sub, font(28, 'reg'), fill=MUTED, anchor='ma', spacing=10)
        layer.putalpha(Image.eval(layer.getchannel('A'), lambda v: int(v * a)))
        im.alpha_composite(layer)
        return im
    return draw

def s_app(name, caption, zoom=(1.0, 1.08), focus=(0.5, 0.5)):
    base = shot(name, 1180).convert('RGBA')
    bg = background(VW, VH, 0.9).convert('RGBA')
    def draw(t, dur):
        im = bg.copy(); d = ImageDraw.Draw(im)
        p = t / dur; z = zoom[0] + (zoom[1] - zoom[0]) * p
        w, h = int(1040 * z), int(1040 * z * base.height / base.width)
        s = base.resize((w, h), Image.BILINEAR)
        x = int(VW / 2 - w * focus[0] + (focus[0] - .5) * 0); y = int(70 + (VH - 150) / 2 - h * focus[1] + h / 2 - (h - 560) * (focus[1] - .5) * .0)
        x = int((VW - w) / 2 - (w - 1040) * (focus[0] - .5)); y = int(40 - (h - 650) * focus[1] * .6)
        im.alpha_composite(rounded(s, 14), (x, y))
        # caption bar
        a = ease(t / 0.5)
        f = font(30, 'semi'); l, tp, r, b = d.textbbox((0, 0), caption, font=f)
        bw, bh = r - l + 56, 64
        bar = Image.new('RGBA', (VW, VH), (0, 0, 0, 0)); bd = ImageDraw.Draw(bar)
        bx, by = (VW - bw) / 2, VH - 100 + 20 * (1 - a)
        bd.rounded_rectangle([bx, by, bx + bw, by + bh], 32, fill=(8, 10, 16, 230), outline=(255, 255, 255, 40))
        bd.text((bx + 28 - l, by + (bh - (b - tp)) / 2 - tp), caption, font=f, fill=INK)
        bar.putalpha(Image.eval(bar.getchannel('A'), lambda v: int(v * a)))
        im.alpha_composite(bar)
        return im
    return draw

def s_end(line2='Free · Open source · Windows & Linux'):
    bg = background(VW, VH, 1.25).convert('RGBA')
    lg = logo(150)
    def draw(t, dur):
        im = bg.copy(); d = ImageDraw.Draw(im)
        a = ease(t / 0.6); sc = 0.85 + 0.15 * a
        l = lg.resize((int(150 * sc), int(150 * sc)), Image.LANCZOS)
        im.alpha_composite(l, (int(VW / 2 - l.width / 2), int(170 + (150 - l.height) / 2)))
        layer = Image.new('RGBA', (VW, VH), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
        text(ld, (VW / 2, 350), 'Sonoma', font(64), anchor='ma')
        text(ld, (VW / 2, 440), line2, font(26, 'reg'), fill=MUTED, anchor='ma')
        pw = ld.textbbox((0, 0), SITE, font=font(26, 'semi'))[2] + 48
        pill(ld, (VW / 2 - pw / 2, 500), SITE, font(26, 'semi'), pad=(24, 12))
        layer.putalpha(Image.eval(layer.getchannel('A'), lambda v: int(v * a)))
        im.alpha_composite(layer)
        return im
    return draw

def render_video(name, scenes):
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    total = sum(s.dur for s in scenes)
    path = os.path.join(OUT, name)
    cmd = [exe, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{VW}x{VH}', '-r', str(FPS), '-i', '-',
           '-f', 'lavfi', '-t', str(total), '-i', 'anullsrc=r=44100:cl=stereo',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
           '-c:a', 'aac', '-b:a', '128k', '-shortest', path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    XF = 0.4  # crossfade seconds
    starts = []; acc = 0
    for s in scenes: starts.append(acc); acc += s.dur
    for i in range(int(total * FPS)):
        t = i / FPS
        k = max(j for j, st in enumerate(starts) if st <= t)
        frame = scenes[k].draw(t - starts[k], scenes[k].dur)
        if k + 1 < len(scenes) and t > starts[k] + scenes[k].dur - XF:
            nxt = scenes[k + 1].draw(0, scenes[k + 1].dur)
            a = (t - (starts[k] + scenes[k].dur - XF)) / XF
            frame = Image.blend(frame, nxt, a)
        p.stdin.write(frame.convert('RGB').tobytes())
    p.stdin.close(); p.wait()
    print('video', name, f'{total}s')

def make_videos():
    render_video('video-1-meet-sonoma-15s.mp4', [
        Scene(3, s_title('Meet Sonoma.', 'The free, open-source music player.', 'NEW')),
        Scene(4, s_app('album', 'Your library, beautifully organised', (1.0, 1.06), (.5, .2))),
        Scene(4, s_app('lyrics', 'Lyrics that light up word by word', (1.0, 1.12), (.85, .55))),
        Scene(4, s_end()),
    ])
    render_video('video-2-get-music-20s.mp4', [
        Scene(3.5, s_title('Build a lossless library.', 'The legal way.', 'GET MUSIC')),
        Scene(4.5, s_app('get-link', 'Paste a link from any streaming app', (1.0, 1.1), (.3, .3))),
        Scene(4, s_app('get-sources', 'Free & legal sources, in FLAC', (1.0, 1.08), (.4, .4))),
        Scene(4, s_app('get-queue', 'Batch downloads with tags, art & lyrics', (1.0, 1.1), (.3, .2))),
        Scene(4, s_end('Never downloads from streaming services.')),
    ])
    render_video('video-3-listen-together-25s.mp4', [
        Scene(3.5, s_title('Same song.\nSame second.', None, 'LISTENING ROOMS')),
        Scene(5, s_app('rooms', 'Host a room, share the code', (1.0, 1.08), (.3, .2))),
        Scene(5, s_app('library', 'Bring playlists from Spotify, M3U or a list', (1.0, 1.06), (.5, .3))),
        Scene(5, s_app('home', 'Smart links open straight in Sonoma', (1.0, 1.06), (.4, .4))),
        Scene(6.5, s_end('Self-host the room server in one command.')),
    ])
    render_video('video-4-why-sonoma-30s.mp4', [
        Scene(3.5, s_title('Why Sonoma?', '6 reasons in 30 seconds.')),
        Scene(4, s_app('album', '1 · Plays the music you own', (1.0, 1.06), (.5, .2))),
        Scene(4, s_app('lyrics', '2 · Word-synced lyrics', (1.0, 1.12), (.85, .55))),
        Scene(4, s_app('get-link', '3 · Get music the legal way', (1.0, 1.08), (.3, .3))),
        Scene(4, s_app('rooms', '4 · Listen together in rooms', (1.0, 1.06), (.3, .2))),
        Scene(3.5, s_title('5 · No ads. No account.', 'No tracking unless you opt in.')),
        Scene(3, s_title('6 · Open source.', 'MIT licence. Fork it, build it, ship it.')),
        Scene(4, s_end(f'{TICKER} on {CHAIN}  ·  CA only on {SITE}')),
    ])

if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'images'):
        make_avatar(); make_banner(); make_post_images(); make_burn_and_launch(); print('images done')
    if what in ('all', 'videos'):
        make_videos()
