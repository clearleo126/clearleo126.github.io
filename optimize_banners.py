import sys
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).parent
SRC = ROOT / "static" / "images"
DST = ROOT / "static" / "banner"

EXCLUDE = {"icon.png", "temp-icon.png", "banner.webp", "desktop.ini"}
EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_W = 1920
QUALITY = 82
METHOD = 4


def flatten(img):
    if img.mode in ("RGBA", "LA", "P"):
        rgba = img.convert("RGBA")
        bg = Image.new("RGB", rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.split()[-1])
        return bg
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def main():
    DST.mkdir(parents=True, exist_ok=True)
    files = [
        p for p in sorted(SRC.iterdir())
        if p.is_file() and p.name not in EXCLUDE and p.suffix.lower() in EXTS
    ]
    total_src = total_dst = processed = skipped = failed = 0
    for i, p in enumerate(files, 1):
        out = DST / (p.stem + ".webp")
        if out.exists() and out.stat().st_mtime >= p.stat().st_mtime:
            skipped += 1
            continue
        try:
            with Image.open(p) as img:
                img = flatten(img)
                if img.width > MAX_W:
                    h = max(1, round(img.height * MAX_W / img.width))
                    img = img.resize((MAX_W, h), Image.LANCZOS)
                img.save(out, "WEBP", quality=QUALITY, method=METHOD)
        except Exception as e:
            failed += 1
            print(f"[fail] {p.name}: {e}", file=sys.stderr)
            continue
        processed += 1
        total_src += p.stat().st_size
        total_dst += out.stat().st_size
        if i % 20 == 0 or i == len(files):
            print(f"progress {i}/{len(files)}")
    print(f"done: {processed} processed, {skipped} up-to-date, {failed} failed")
    print(f"size: {total_src/1048576:.1f}MB -> {total_dst/1048576:.1f}MB")


if __name__ == "__main__":
    sys.exit(main())
