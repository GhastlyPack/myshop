#!/usr/bin/env python3
"""
Generate the /features page artwork with the OpenAI Images API, in the brand style.

  python3 scripts/gen-features-art.py            # generate missing assets
  python3 scripts/gen-features-art.py --force    # regenerate everything
  python3 scripts/gen-features-art.py hero sell  # only these keys

Reads OPENAI_API_KEY from the environment or .env.local (never commit the key).
Model: OPENAI_IMAGE_MODEL if set, else tries the newest known image model and falls
back. Output: public/landing/features/<key>.jpg (hero 1536x1024, chapters 1200x800).
"""
import base64
import io
import json
import os
import sys
import urllib.error
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "landing", "features")

STYLE = (
    "Minimal editorial 3D still life, photoreal render. Pale blue-grey seamless studio background (#F1F4F8), "
    "soft diffused daylight, gentle shadows. Objects in matte near-black (#111111) with exactly one vivid orange "
    "(#F4611E) accent element. Clean composition, generous negative space, product-photography feel. "
    "No text, no letters, no numbers, no logos, no people, no hands."
)

ASSETS = {
    "hero": (
        1536,
        "A smartphone standing upright showing an abstract storefront of stacked rounded cards, beside a small orange striped "
        "awning over a doorway-shaped card, a single coin, and a folded document. Wide 3:2 framing, hero composition.",
    ),
    "sell": (
        1200,
        "Three matte black boxes in ascending size in a row, each wrapped with a thin band, the largest with an orange band; "
        "a small price tag and an orange plus-shaped token in front. Evokes pricing tiers and add-ons.",
    ),
    "book": (
        1200,
        "A matte black desk calendar with one date marked by a glowing orange dot, a minimalist wristwatch, and a ceramic cup; "
        "beside it a phone lying flat showing a grid of empty time-slot tiles. Evokes booking a call.",
    ),
    "grow": (
        1200,
        "A matte black megaphone angled toward a rising bar chart built from stacked black blocks with the tallest bar in orange, "
        "and a small rounded speech-bubble card. Evokes audience growth and auto-replies.",
    ),
    "design": (
        1200,
        "A fanned matte black paint-swatch deck, a slim ruler, and an orange pen laid over a blank phone mockup, arranged like "
        "a designer's kit. Evokes a store design editor.",
    ),
    "deliver": (
        1200,
        "An open matte black envelope with a bright orange document card sliding out, next to a small padlock and a round "
        "checkmark token. Evokes instant, secure delivery.",
    ),
}

MODELS = [m for m in [os.environ.get("OPENAI_IMAGE_MODEL"), "gpt-image-2.5-sunburst", "gpt-image-1"] if m]


def load_key():
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if key:
        return key
    env_path = os.path.join(ROOT, ".env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENAI_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
    return ""


def generate(key, model, prompt):
    body = json.dumps({"model": model, "prompt": prompt, "size": "1536x1024", "quality": "high", "n": 1}).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as res:
        data = json.load(res)
    item = data["data"][0]
    if "b64_json" in item:
        return base64.b64decode(item["b64_json"])
    with urllib.request.urlopen(item["url"], timeout=120) as r:
        return r.read()


def save_jpg(png_bytes, path, width):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, "JPEG", quality=86, optimize=True, progressive=True)
    return im.size


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    keys = args or list(ASSETS.keys())
    key = load_key()
    if not key:
        print("No OPENAI_API_KEY found. Add it to .env.local (OPENAI_API_KEY=...) or export it, then rerun.")
        sys.exit(2)
    os.makedirs(OUT, exist_ok=True)
    for k in keys:
        if k not in ASSETS:
            print(f"unknown asset: {k}")
            continue
        width, subject = ASSETS[k]
        path = os.path.join(OUT, f"{k}.jpg")
        if os.path.exists(path) and not force:
            print(f"skip {k} (exists; --force to redo)")
            continue
        prompt = f"{subject}\n\n{STYLE}"
        last_err = None
        for model in MODELS:
            try:
                print(f"{k}: generating with {model} …", flush=True)
                png = generate(key, model, prompt)
                size = save_jpg(png, path, width)
                print(f"{k}: saved {os.path.relpath(path, ROOT)} {size[0]}x{size[1]}")
                last_err = None
                break
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors="replace")[:300]
                last_err = f"{model}: HTTP {e.code} {msg}"
                # Unknown model → try the next one; anything else is a real failure.
                if e.code in (400, 404) and "model" in msg.lower():
                    continue
                break
            except Exception as e:  # noqa: BLE001
                last_err = f"{model}: {e}"
                break
        if last_err:
            print(f"{k}: FAILED — {last_err}")


if __name__ == "__main__":
    main()
