#!/usr/bin/env python3
"""
Compose the visitmy.shop branding INTO the /features renders (not stacked on top): the image
model's edit mode gets the untouched render plus the exact brand assets as references and is
asked to print/emboss the logo onto specific objects — matching perspective, lighting and
material — while changing nothing else.

  python3 scripts/brand-features-art.py            # all six
  python3 scripts/brand-features-art.py hero sell  # only these
  BRAND_DIR=/path/to/{wm-light,wm-dark,mark}.png   # reference assets (default: scratch dir)

Inputs:  scripts/features-art/raw/<key>.jpg (the untouched generations)
Outputs: scripts/features-art/composed/<key>.png (full res) + public/landing/features/<key>.jpg
Reads OPENAI_API_KEY from the environment. Model: OPENAI_IMAGE_MODEL, else newest known, with fallback.
"""
import base64
import io
import json
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "scripts", "features-art", "raw")
COMPOSED = os.path.join(ROOT, "scripts", "features-art", "composed")
OUT = os.path.join(ROOT, "public", "landing", "features")
BRAND = os.environ.get("BRAND_DIR", "/private/tmp/claude-501/-Users-ghastly-myshop/378874fc-77dd-4246-b0b8-5e924d2db82e/scratchpad/brand")

WM_LIGHT, WM_DARK, MARK = "wm-light.png", "wm-dark.png", "mark.png"

RULES = (
    " Reproduce the provided logo exactly: identical letterforms, proportions, spacing and colors — do not redraw, restyle, "
    "warp the lettering, or add any other text, icons or logos anywhere. Integrate it as a physical print or emboss on that "
    "surface: follow the object's exact perspective and curvature, receive the scene's lighting, shadows and material sheen, "
    "and stay razor sharp. Keep every other object, the composition, camera, lighting and background pixel-identical."
)

# key → (output width, reference assets, placement prompt)
ASSETS = {
    "hero": (
        1536,
        [WM_DARK, MARK],
        "Image 1 is the scene. Image 2 is the visitmy.shop wordmark (white version). Image 3 is the visitmy.shop awning mark (orange). "
        "Place the white wordmark as the app header at the very top of the phone's screen, just below the notch, horizontally centered, "
        "about 60% of the screen width, lying flat on the screen glass and following the phone's slight perspective. "
        "Emboss the orange awning mark on the face of the coin as a raised medallion centered on the coin, catching the same light as the coin.",
    ),
    "sell": (
        1200,
        [WM_LIGHT],
        "Image 1 is the scene. Image 2 is the visitmy.shop wordmark (ink version). Print the wordmark on the white paper hang tag, "
        "to the right of the string hole and centered in the remaining space, following the tag's angle and perspective, "
        "like crisp ink printed on card stock with the tag's soft shadows.",
    ),
    "book": (
        1200,
        [MARK],
        "Image 1 is the scene. Image 2 is the visitmy.shop awning mark (orange). Print the mark on the front of the black ceramic mug, "
        "centered on the body facing the camera, about a third of the mug's width, wrapping subtly with the mug's curvature and "
        "sitting under its matte highlight like a screen-printed ceramic glaze.",
    ),
    "grow": (
        1200,
        [WM_DARK],
        "Image 1 is the scene. Image 2 is the visitmy.shop wordmark (white version). Print the white wordmark centered inside the dark "
        "speech bubble, about 80% of the bubble's width, following the bubble's slight tilt, as a matte print on its surface.",
    ),
    "design": (
        1200,
        [WM_LIGHT],
        "Image 1 is the scene. Image 2 is the visitmy.shop wordmark (ink version). Show the ink wordmark centered on the phone's white "
        "screen like an app splash screen, about 70% of the screen width, following the phone's rotation and perspective, crisp on the glass.",
    ),
    "deliver": (
        1200,
        [WM_DARK],
        "Image 1 is the scene. Image 2 is the visitmy.shop wordmark (white version). Print the white wordmark on the upper half of the "
        "orange card standing in the envelope, centered, about 70% of the card's width, following the card's slight tilt, like white ink on card stock.",
    ),
}

MODELS = [m for m in [os.environ.get("OPENAI_IMAGE_MODEL"), "gpt-image-2.5-sunburst", "gpt-image-1"] if m]


def edit(key_api, model, raw_path, refs, prompt, size, fidelity=True):
    cmd = ["curl", "-sS", "https://api.openai.com/v1/images/edits", "-H", f"Authorization: Bearer {key_api}", "-F", f"model={model}", "-F", f"prompt={prompt}", "-F", f"size={size}", "-F", "quality=high", "-F", "n=1"]
    if fidelity:
        cmd += ["-F", "input_fidelity=high"]
    cmd += ["-F", f"image[]=@{raw_path}"]
    for r in refs:
        cmd += ["-F", f"image[]=@{os.path.join(BRAND, r)}"]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if res.returncode != 0:
        raise RuntimeError(f"curl failed: {res.stderr[:300]}")
    data = json.loads(res.stdout)
    if "error" in data:
        raise RuntimeError(json.dumps(data["error"])[:400])
    return base64.b64decode(data["data"][0]["b64_json"])


def save(png_bytes, key, width):
    os.makedirs(COMPOSED, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(COMPOSED, f"{key}.png"), "wb") as f:
        f.write(png_bytes)
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path = os.path.join(OUT, f"{key}.jpg")
    im.save(path, "JPEG", quality=88, optimize=True, progressive=True)
    return im.size


def main():
    keys = [a for a in sys.argv[1:] if not a.startswith("--")] or list(ASSETS.keys())
    key_api = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key_api:
        print("No OPENAI_API_KEY in the environment.")
        sys.exit(2)
    for k in keys:
        width, refs, prompt = ASSETS[k]
        raw = os.path.join(RAW, f"{k}.jpg")
        size = "1536x1024" if k == "hero" else "auto"
        done = False
        for model in MODELS:
            for fidelity in (True, False):
                try:
                    print(f"{k}: editing with {model}{' (input_fidelity=high)' if fidelity else ''} …", flush=True)
                    png = edit(key_api, model, raw, refs, prompt + RULES, size, fidelity)
                    print(f"{k}: saved {save(png, k, width)}")
                    done = True
                    break
                except RuntimeError as e:
                    msg = str(e)
                    print(f"{k}: {model}: {msg[:200]}")
                    low = msg.lower()
                    if fidelity and "input_fidelity" in low:
                        continue  # retry this model without the param
                    break  # move to the next model
            if done:
                break
        if not done:
            print(f"{k}: FAILED")


if __name__ == "__main__":
    main()
