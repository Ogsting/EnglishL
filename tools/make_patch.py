"""对比两版词库，生成增量补丁 patch-<n>.json。

用法：
    python tools/make_patch.py 旧词库.json 新词库.json --version 2 --out words/patch-2.json

产物格式（App 端直接消费）：
    { "version": 2, "added": [...], "updated": [...], "removed": ["abandonment"] }

发布流程：
    1) 生成 patch-2.json，上传到静态托管的 words/ 目录
    2) 把 words/version.json 改成 { "latest": 2 }
    3) 用户下次打开 App（有网）就会静默合并
"""

import argparse
import io
import json
import os


def key(item):
    return (item.get("w") or "").strip().lower()


def load(path):
    with io.open(path, encoding="utf-8") as f:
        return {key(x): x for x in json.load(f) if key(x)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("old", help="上一版词库 words.json")
    ap.add_argument("new", help="这一版词库 words.json")
    ap.add_argument("--version", type=int, required=True, help="这一版的版本号，必须比上一版大 1")
    ap.add_argument("--out", required=True, help="输出 patch-<n>.json 的路径")
    args = ap.parse_args()

    old, new = load(args.old), load(args.new)

    added = [new[k] for k in new if k not in old]
    removed = [k for k in old if k not in new]
    updated = []
    for k, item in new.items():
        prev = old.get(k)
        if prev is None:
            continue
        if any(prev.get(f) != item.get(f) for f in ("ph", "pos", "cn", "w")):
            updated.append(item)

    patch = {"version": args.version, "added": added, "updated": updated, "removed": removed}

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with io.open(args.out, "w", encoding="utf-8") as f:
        json.dump(patch, f, ensure_ascii=False, separators=(",", ":"))

    size = os.path.getsize(args.out)
    print(f"patch v{args.version}: +{len(added)} 新增 / ~{len(updated)} 修改 / -{len(removed)} 删除 · {size/1024:.1f} KB")
    print(f"写到 {args.out}")
    print("别忘了把 version.json 更新成：", json.dumps({"latest": args.version}))


if __name__ == "__main__":
    main()
