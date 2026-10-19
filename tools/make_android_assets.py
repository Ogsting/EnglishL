"""生成 Android 图标与启动图（我的世界像素风 · 木棍拼成的 E）。

用法：python tools/make_android_assets.py
产物直接写进 android/app/src/main/res/ 下对应的 mipmap / drawable 目录。
"""

import os
import random

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

# 配色：深色木板底 + 浅橡木棍
PLANK = (58, 42, 26)
PLANK_DARK = (44, 31, 19)
PLANK_LINE = (36, 25, 15)
STICK = (200, 154, 91)
STICK_HI = (224, 184, 120)
STICK_DARK = (150, 108, 58)
OUTLINE = (28, 18, 9)
WHITE = (240, 244, 248)
SUB = (139, 154, 168)

GRID = 32


def planks(size: int) -> Image.Image:
    """32x32 像素木板背景，再按整数倍放大"""
    img = Image.new("RGBA", (GRID, GRID), PLANK + (255,))
    d = ImageDraw.Draw(img)
    rnd = random.Random(20261019)
    for y in range(GRID):
        for x in range(GRID):
            c = PLANK
            if y % 8 == 0:
                c = PLANK_LINE
            elif rnd.random() < 0.05:
                c = PLANK_DARK
            d.point((x, y), fill=c + (255,))
    return img.resize((size, size), Image.NEAREST)


def stick_e(size: int) -> Image.Image:
    """32x32 的「木棍 E」，透明背景"""
    img = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 四根棍子：(x0, y0, x1, y1)
    sticks = [
        (8, 7, 11, 26),    # 竖
        (13, 8, 24, 11),   # 上横
        (13, 15, 21, 18),  # 中横
        (13, 23, 24, 26),  # 下横
    ]

    for x0, y0, x1, y1 in sticks:
        # 深色描边
        d.rectangle([x0 - 1, y0 - 1, x1 + 1, y1 + 1], fill=OUTLINE + (255,))
        # 棍身
        d.rectangle([x0, y0, x1, y1], fill=STICK + (255,))
        # 顶部/左侧高光
        d.rectangle([x0, y0, x1, y0], fill=STICK_HI + (255,))
        d.rectangle([x0, y0, x0, y1], fill=STICK_HI + (255,))
        # 底部暗边
        d.rectangle([x0, y1, x1, y1], fill=STICK_DARK + (255,))

    return img.resize((size, size), Image.NEAREST)


def tile(size: int, radius_ratio: float = 0.18) -> Image.Image:
    """带木板底和圆角的 App 图标"""
    base = planks(size)
    e = stick_e(size)
    base.alpha_composite(e)

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255
    )
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


def round_icon(size: int) -> Image.Image:
    base = planks(size)
    e = stick_e(size)
    base.alpha_composite(e)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


def font(size: int, bold: bool = True):
    for path in (
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
    ):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def splash(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), (17, 22, 28))
    d = ImageDraw.Draw(img)
    top, bottom = (27, 34, 43), (13, 17, 22)
    for y in range(h):
        k = y / max(1, h - 1)
        d.line(
            [(0, y), (w, y)],
            fill=(
                int(top[0] + (bottom[0] - top[0]) * k),
                int(top[1] + (bottom[1] - top[1]) * k),
                int(top[2] + (bottom[2] - top[2]) * k),
            ),
        )

    s = min(w, h) / 1080
    logo = tile(int(300 * s), 0.2)
    img.paste(logo, ((w - logo.width) // 2, int(h * 0.36)), logo)

    title = font(int(84 * s))
    sub = font(int(38 * s), bold=False)
    t = "EnglishL"
    tw = d.textbbox((0, 0), t, font=title)[2]
    d.text(((w - tw) // 2, int(h * 0.36) + int(340 * s)), t, font=title, fill=WHITE)

    st = "四六级单词卡"
    sw = d.textbbox((0, 0), st, font=sub)[2]
    d.text(((w - sw) // 2, int(h * 0.36) + int(450 * s)), st, font=sub, fill=SUB)
    return img


def main():
    dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, k in dens.items():
        folder = os.path.join(RES, f"mipmap-{name}")
        if not os.path.isdir(folder):
            continue
        legacy = int(48 * k)
        tile(legacy).save(os.path.join(folder, "ic_launcher.png"))
        round_icon(legacy).save(os.path.join(folder, "ic_launcher_round.png"))

        # 自适应图标前景：透明底，只放木棍 E，留出安全边距
        fg = int(108 * k)
        inner = int(fg * 0.62)
        canvas = Image.new("RGBA", (fg, fg), (0, 0, 0, 0))
        e = stick_e(inner)
        canvas.alpha_composite(e, ((fg - inner) // 2, (fg - inner) // 2))
        canvas.save(os.path.join(folder, "ic_launcher_foreground.png"))
        print(f"mipmap-{name}: launcher {legacy}px, foreground {fg}px")

    for root, _dirs, files in os.walk(RES):
        if "splash.png" in files:
            p = os.path.join(root, "splash.png")
            with Image.open(p) as im:
                w, h = im.size
            splash(w, h).save(p)

    print("启动图已更新")


if __name__ == "__main__":
    main()
