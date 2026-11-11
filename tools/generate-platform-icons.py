"""Generates the per-site toolbar icons in icons/platforms/<site>/icon{16,32,48,128}.png.

Simplified, flat versions of each platform's mark, drawn with Pillow at 512px
and downsampled for clean anti-aliasing. To use your own artwork instead,
just drop PNGs with the same names into icons/platforms/<site>/.

Usage (from the repo root):  python tools/generate-platform-icons.py
Requires: pip install pillow
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons" / "platforms"
SIZES = (16, 32, 48, 128)
S = 512  # master canvas size


def canvas():
    return Image.new("RGBA", (S, S), (0, 0, 0, 0))


def bold_font(px):
    for name in ("arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            pass
    return ImageFont.load_default()


def youtube():
    img = canvas()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((8, 80, S - 8, S - 80), radius=110, fill="#FF0033")
    d.polygon([(205, 168), (205, 344), (355, 256)], fill="white")
    return img


def facebook():
    img = canvas()
    d = ImageDraw.Draw(img)
    d.ellipse((8, 8, S - 8, S - 8), fill="#0866FF")
    d.text((282, 296), "f", font=bold_font(430), fill="white", anchor="mm")
    return img


def instagram():
    # diagonal yellow -> pink -> purple gradient in a rounded square
    stops = [(0.0, (254, 218, 117)), (0.35, (250, 126, 30)), (0.6, (214, 41, 118)), (1.0, (79, 91, 213))]

    def color_at(t):
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t <= t1:
                k = (t - t0) / (t1 - t0)
                return tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
        return stops[-1][1]

    grad = Image.new("RGBA", (S, S))
    px = grad.load()
    for y in range(S):
        for x in range(S):
            px[x, y] = color_at(((x + (S - y)) / (2 * S)) ** 0.9) + (255,)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((8, 8, S - 8, S - 8), radius=130, fill=255)
    img = canvas()
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)
    d.rounded_rectangle((100, 100, S - 100, S - 100), radius=90, outline="white", width=38)
    d.ellipse((171, 171, S - 171, S - 171), outline="white", width=38)
    d.ellipse((330, 140, 372, 182), fill="white")
    return img


def tiktok():
    img = canvas()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((8, 8, S - 8, S - 8), radius=120, fill="#000000")

    def note(dx, dy, fill):
        layer = canvas()
        n = ImageDraw.Draw(layer)
        n.ellipse((120 + dx, 260 + dy, 260 + dx, 400 + dy), outline=fill, width=44)  # note head ring
        n.rectangle((216 + dx, 100 + dy, 260 + dx, 332 + dy), fill=fill)           # stem
        n.pieslice((216 + dx, 0 + dy, 400 + dx, 200 + dy), 90, 180, fill=fill)     # flag curve
        n.ellipse((262 + dx, 56 + dy, 362 + dx, 156 + dy), fill=(0, 0, 0, 255))     # carve flag
        return layer

    img.alpha_composite(note(-12, -10, "#25F4EE"))
    img.alpha_composite(note(12, 10, "#FE2C55"))
    img.alpha_composite(note(0, 0, "white"))
    return img


ICONS = {"youtube": youtube, "facebook": facebook, "instagram": instagram, "tiktok": tiktok}

if __name__ == "__main__":
    for site, draw in ICONS.items():
        master = draw()
        folder = OUT / site
        folder.mkdir(parents=True, exist_ok=True)
        for size in SIZES:
            master.resize((size, size), Image.LANCZOS).save(folder / f"icon{size}.png", optimize=True)
        print(f"wrote {folder.relative_to(ROOT)}")
