"""生成 Android 图标与启动图（我的世界像素风）。

用法：python tools/make_android_assets.py
产物直接写进 android/app/src/main/res/ 下对应的 mipmap / drawable 目录。
"""

import os
import random

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

# 我的世界配色
GRASS = (101, 163, 65)
GRASS_HI = (124, 179, 66)
GRASS_DARK = (74, 124, 48)
DIRT = (139, 90, 43)
DIRT_HI = (161, 106, 53)
DIRT_DARK = (107, 68, 35)
EDGE = (58, 36, 19)
WHITE = (245, 245, 240)

GRID = 32


def block_pixels():
    """32x32 像素画的草方块"""
    img = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rnd = random.Random(20261019)

    for y in range(GRID):
        for x in range(GRID):
            if y < 9:
                c = GRASS_HI if y < 3 else GRASS
                if rnd.random() < 0.06:
                    c = GRASS_DARK
            else:
                c = DIRT
                if rnd.random() < 0.07:
                    c = DIRT_DARK
                elif rnd.random() < 0.05:
                    c = DIRT_HI
            d.point((x, y), fill=c)

    # 边界暗线
    d.rectangle([0, 0, GRID - 1, GRID - 1], outline=EDGE)

    # 中间的白 E（8x10 像素字，带描边）
    ex, ey, ew, eh = 10, 11, 12, 12
    bars = [
        (0, 0, ew - 1, 2),          # 上横
        (0, eh // 2 - 1, ew - 4, 2),  # 中横
        (0, eh - 3, ew - 1, 2),     # 下横
        (0, 0, 2, eh),              # 竖
    ]
    for bx, by, bw, bh in bars:
        d.rectangle([ex + bx, ey + by, ex + bx + bw, ey + by + bh], fill=WHITE)

    # 描边：把 E 周围一圈画成深色，保证浅色块上也看得清
    outline = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
    od = ImageDraw.Draw(outline)
    for bx, by, bw, bh in bars:
        od.rectangle([ex + bx - 1, ey + by - 1, ex + bx + bw + 1, ey + by + bh + 1], fill=(30, 20, 10, 255))
    img = Image.alpha_composite(outline, img)
    return img


BLOCK = block_pixels()


def scaled(size, padding_ratio=0.0):
    inner = int(size * (1 - padding_ratio * 2))
    img = BLOCK.resize((inner, inner), Image.NEAREST)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    canvas.paste(img, (off, off), img)
    return canvas


def round_icon(size):
    canvas = Image.new("RGBA", (size, size), (17, 22, 28, 255))
    inner = int(size * 0.82)
    img = BLOCK.resize((inner, inner), Image.NEAREST)
    off = (size - inner) // 2
    canvas.paste(img, (off, off), img)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    return out


def font(size, bold=True):
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


def splash(w, h):
    img = Image.new("RGB", (w, h), (17, 22, 28))
    d = ImageDraw.Draw(img)
    # 极淡的顶部提亮，避免纯死黑（渐变铺满整屏，不留接缝）
    top, bottom = (27, 34, 43), (15, 19, 24)
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
    logo = BLOCK.resize((int(300 * s), int(300 * s)), Image.NEAREST)
    img.paste(logo, ((w - logo.width) // 2, int(h * 0.36)), logo)

    title = font(int(84 * s))
    sub = font(int(38 * s), bold=False)
    t = "EnglishL"
    tw = d.textbbox((0, 0), t, font=title)[2]
    d.text(((w - tw) // 2, int(h * 0.36) + int(340 * s)), t, font=title, fill=(240, 244, 248))

    st = "四六级单词卡"
    sw = d.textbbox((0, 0), st, font=sub)[2]
    d.text(
        ((w - sw) // 2, int(h * 0.36) + int(450 * s)),
        st,
        font=sub,
        fill=(139, 154, 168),
    )
    return img


def main():
    dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, k in dens.items():
        folder = os.path.join(RES, f"mipmap-{name}")
        if not os.path.isdir(folder):
            continue
        legacy = int(48 * k)
        scaled(legacy).save(os.path.join(folder, "ic_launcher.png"))
        round_icon(legacy).save(os.path.join(folder, "ic_launcher_round.png"))
        fg = int(108 * k)
        scaled(fg, padding_ratio=0.18).save(os.path.join(folder, "ic_launcher_foreground.png"))
        print(f"mipmap-{name}: launcher {legacy}px, foreground {fg}px")

    # 启动图：沿用 Capacitor 已有的尺寸，只是换内容
    for root, _dirs, files in os.walk(RES):
        if "splash.png" in files:
            p = os.path.join(root, "splash.png")
            with Image.open(p) as im:
                w, h = im.size
            splash(w, h).save(p)
            print(f"{os.path.relpath(p, RES)}: {w}x{h}")


if __name__ == "__main__":
    main()
