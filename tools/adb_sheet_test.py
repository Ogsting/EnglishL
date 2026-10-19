"""在模拟器上自动验证：设置弹层能打开、能✕关闭、能返回键关闭且不退出 App。

用法：python tools/adb_sheet_test.py
依赖：adb 在 PATH 或设置 ADB 环境变量
"""

import io
import os
import re
import subprocess
import time

from PIL import Image

ADB = os.environ.get("ADB", r"D:\Android\Sdk\platform-tools\adb.exe")
PKG = "com.ogsting.englishl"
GEAR = (840, 96)


def sh(*args, **kw):
    return subprocess.run([ADB, *args], capture_output=True, text=True, timeout=60, **kw).stdout


def shot(name):
    remote = f"/sdcard/{name}.png"
    local = os.path.join(os.environ["TEMP"], f"{name}.png")
    sh("shell", "screencap", "-p", remote)
    if os.path.exists(local):
        os.remove(local)
    sh("pull", remote, local)
    return local


def focus():
    out = sh("shell", "dumpsys", "window")
    m = re.search(r"mCurrentFocus=.*?([\w.]+/[\w.]+)\}", out)
    return m.group(1) if m else "?"


def find_close(path):
    """在截图右上区域找 ✕ 的亮点中心"""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    xs, ys = [], []
    for y in range(int(h * 0.12), int(h * 0.32)):
        for x in range(int(w * 0.88), w - 1):
            r, g, b = px[x, y]
            if r > 190 and g > 190 and b > 190:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return ((min(xs) + max(xs)) // 2, (min(ys) + max(ys)) // 2)


def main():
    sh("shell", "am", "force-stop", PKG)
    sh("shell", "am", "start", "-n", f"{PKG}/.MainActivity")
    time.sleep(5)

    # 1. 打开设置
    sh("shell", "input", "tap", str(GEAR[0]), str(GEAR[1]))
    time.sleep(1.5)
    p1 = shot("t1")
    print("① 打开设置，前台:", focus())

    # 2. 点 ✕
    pos = find_close(p1)
    print("   找到 ✕ 坐标:", pos)
    if pos:
        sh("shell", "input", "tap", str(pos[0]), str(pos[1]))
        time.sleep(1.5)
        p2 = shot("t2")
        same = open(p1, "rb").read() == open(p2, "rb").read()
        print("② 点 ✕ 后弹层关闭:", not same, "| 前台:", focus())

    # 3. 再打开，按返回键
    sh("shell", "input", "tap", str(GEAR[0]), str(GEAR[1]))
    time.sleep(1.5)
    p3 = shot("t3")
    sh("shell", "input", "keyevent", "4")
    time.sleep(1.5)
    p4 = shot("t4")
    print("③ 返回键后弹层关闭:", open(p3, "rb").read() != open(p4, "rb").read(), "| 前台:", focus())


if __name__ == "__main__":
    main()
