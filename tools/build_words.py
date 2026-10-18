"""生成 App 内置的离线词库 src/data/words.json。

数据来源（只用干净授权的数据）：
- research/build_cet4.json / build_cet6.json
  = skywind3000/ECDICT（MIT）按 tag=cet4 / cet6 切片并归一化后的结果
  字段：word / phonetic / pos[] / translations[]

产物：[{ w, ph, pos, cn, tag }]，安装包自带，断网可用。
"""

import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "research")
OUT = os.path.join(ROOT, "src", "data", "words.json")

POS_MAP = {
    "n": "n.",
    "v": "v.",
    "vt": "vt.",
    "vi": "vi.",
    "adj": "adj.",
    "a": "adj.",
    "adv": "adv.",
    "prep": "prep.",
    "conj": "conj.",
    "pron": "pron.",
    "num": "num.",
    "art": "art.",
    "int": "int.",
    "aux": "aux.",
    "abbr": "abbr.",
}

DOMAIN_TAG = re.compile(r"^\[[^\]]{1,4}\]\s*")
POS_PREFIX = re.compile(r"^((?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|abbr)\.)\s+")


def norm_phonetic(ph: str) -> str:
    if not ph:
        return ""
    ph = ph.replace("\u04d9", "\u0259").replace("'", "\u02c8")
    ph = ph.replace(".", "\u02cc").replace(":", "\u02d0")
    ph = ph.strip()
    return ph if ph.startswith("/") else f"/{ph}/"


def norm_pos(items) -> str:
    out = []
    for p in items or []:
        key = str(p).strip().lower()
        nice = POS_MAP.get(key, f"{key}." if key else "")
        if nice and nice not in out:
            out.append(nice)
    return "/".join(out[:3])


def norm_cn(translations) -> str:
    parts = []
    for t in translations or []:
        s = DOMAIN_TAG.sub("", str(t)).strip()
        s = POS_PREFIX.sub("", s)
        s = s.replace("\n", "；").replace(", ", "，").strip(" 　;；")
        if s:
            parts.append(s)
    # 合并前两个义项，避免卡片太长
    merged = "；".join(parts[:2])
    return merged[:60]


def load(name, tag, rows, seen):
    path = os.path.join(RES, name)
    if not os.path.exists(path):
        print(f"! 缺少 {name}")
        return
    data = json.load(io.open(path, encoding="utf-8"))
    kept = 0
    for item in data:
        w = (item.get("word") or "").strip()
        if not w or w.lower() in seen:
            continue
        cn = norm_cn(item.get("translations"))
        if not cn:
            continue
        ph = norm_phonetic(item.get("phonetic") or item.get("us") or "")
        rows.append(
            {
                "w": w if w.islower() or not w.isalpha() else w.lower(),
                "ph": ph,
                "pos": norm_pos(item.get("pos")),
                "cn": cn,
                "tag": tag,
            }
        )
        seen.add(w.lower())
        kept += 1
    print(f"{name}: {len(data)} 条 -> 收录 {kept}")


def main():
    rows, seen = [], set()
    load("build_cet4.json", "cet4", rows, seen)
    load("build_cet6.json", "cet6", rows, seen)

    rows.sort(key=lambda r: r["w"].lower())
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))

    with_ph = sum(1 for r in rows if r["ph"])
    with_pos = sum(1 for r in rows if r["pos"])
    size = os.path.getsize(OUT) / 1024
    print(f"写出 {len(rows)} 词 -> {OUT}")
    print(f"音标 {with_ph} ({with_ph/max(len(rows),1):.1%}) · 词性 {with_pos} ({with_pos/max(len(rows),1):.1%}) · {size:.0f} KB")
    for r in rows[:2] + rows[len(rows) // 2 : len(rows) // 2 + 2]:
        print("  ", json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    main()
