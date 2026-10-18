"""Generate placement SVGs and a simple PNG home-screen icon."""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GUIDES = ROOT / "app" / "guides"
ICONS = ROOT / "app" / "icons"

BODY = "#e4c7b2"
LINE = "#2c211c"
TAPE = "#c9a227"
CALIPER = "#3d4a55"
FOLD = "#d4785a"
BG = "#f6efe4"
MARK = "#c45c26"


def figure_front() -> str:
    return f"""
  <ellipse cx="100" cy="36" rx="16" ry="18" fill="{BODY}" stroke="{LINE}" stroke-width="2"/>
  <path d="M88 52c2 10 6 12 12 12s10-2 12-12" fill="none" stroke="{LINE}" stroke-width="2"/>
  <path d="M72 78c8-14 48-14 56 0l10 58c2 16-8 28-28 28H90c-20 0-30-12-28-28z" fill="{BODY}" stroke="{LINE}" stroke-width="2"/>
  <path d="M74 86c-18 8-28 28-30 48" fill="none" stroke="{LINE}" stroke-width="8" stroke-linecap="round"/>
  <path d="M126 86c18 8 28 28 30 48" fill="none" stroke="{LINE}" stroke-width="8" stroke-linecap="round"/>
  <path d="M90 164l-6 92" fill="none" stroke="{LINE}" stroke-width="10" stroke-linecap="round"/>
  <path d="M110 164l6 92" fill="none" stroke="{LINE}" stroke-width="10" stroke-linecap="round"/>
  <circle cx="100" cy="148" r="2.2" fill="{LINE}"/>
"""


def figure_back() -> str:
    return f"""
  <ellipse cx="100" cy="36" rx="16" ry="18" fill="{BODY}" stroke="{LINE}" stroke-width="2"/>
  <path d="M88 52c2 10 6 12 12 12s10-2 12-12" fill="none" stroke="{LINE}" stroke-width="2"/>
  <path d="M72 78c8-14 48-14 56 0l10 58c2 16-8 28-28 28H90c-20 0-30-12-28-28z" fill="{BODY}" stroke="{LINE}" stroke-width="2"/>
  <path d="M86 88l14 18 14-18" fill="none" stroke="{LINE}" stroke-width="1.6"/>
  <path d="M74 86c-18 8-28 28-30 48" fill="none" stroke="{LINE}" stroke-width="8" stroke-linecap="round"/>
  <path d="M126 86c18 8 28 28 30 48" fill="none" stroke="{LINE}" stroke-width="8" stroke-linecap="round"/>
  <path d="M90 164l-6 92" fill="none" stroke="{LINE}" stroke-width="10" stroke-linecap="round"/>
  <path d="M110 164l6 92" fill="none" stroke="{LINE}" stroke-width="10" stroke-linecap="round"/>
"""


def figure_side() -> str:
    return f"""
  <ellipse cx="108" cy="36" rx="14" ry="18" fill="{BODY}" stroke="{LINE}" stroke-width="2"/>
  <path d="M108 54v12" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>
  <path d="M96 78c4-12 28-12 30 6l4 52c2 18-10 30-24 30h-8c-14 0-22-14-20-30z" fill="{BODY}" stroke="{LINE}" stroke-width="2"/>
  <path d="M118 88c16 10 18 38 8 58" fill="none" stroke="{LINE}" stroke-width="8" stroke-linecap="round"/>
  <path d="M104 166l2 92" fill="none" stroke="{LINE}" stroke-width="11" stroke-linecap="round"/>
"""


def tape_band(x: float, y: float, w: float, tilt: float = 0) -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="7" rx="2" '
        f'transform="rotate({tilt} {x + w / 2} {y + 3.5})" fill="{TAPE}" stroke="{LINE}" stroke-width="1"/>'
    )


def caliper(x: float, y: float, rot: float = 0) -> str:
    return f"""
  <g transform="translate({x} {y}) rotate({rot})">
    <path d="M0 0c-10 -8 -18 -4 -22 6" fill="none" stroke="{CALIPER}" stroke-width="3" stroke-linecap="round"/>
    <path d="M0 0c-10 8 -18 4 -22 -6" fill="none" stroke="{CALIPER}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="3.2" fill="{CALIPER}"/>
    <path d="M-20 -4c2 0 6 4 8 4s6-4 8-4" fill="{FOLD}" stroke="{LINE}" stroke-width="1"/>
  </g>
"""


def marker(x: float, y: float) -> str:
    return (
        f'<circle cx="{x}" cy="{y}" r="7" fill="none" stroke="{MARK}" stroke-width="2.4"/>'
        f'<circle cx="{x}" cy="{y}" r="2.4" fill="{MARK}"/>'
    )


def wrap(label: str, body: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" role="img" aria-label="{label}">
  <rect width="200" height="280" rx="18" fill="{BG}"/>
  {body}
  <text x="100" y="268" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="{LINE}">{label}</text>
</svg>
"""


SITES = {
    "tape-neck": wrap(
        "Tape · neck",
        figure_front() + tape_band(84, 58, 32, 8) + marker(100, 62),
    ),
    "tape-chest": wrap(
        "Tape · chest",
        figure_front() + tape_band(70, 108, 60, 0) + marker(100, 111),
    ),
    "tape-waist": wrap(
        "Tape · waist",
        figure_front() + tape_band(74, 145, 52, 0) + marker(100, 148),
    ),
    "tape-hips": wrap(
        "Tape · hips",
        figure_front() + tape_band(72, 168, 56, 0) + marker(100, 171),
    ),
    "tape-arm": wrap(
        "Tape · mid-arm",
        figure_front() + tape_band(28, 118, 28, 70) + marker(46, 128),
    ),
    "tape-thigh": wrap(
        "Tape · mid-thigh",
        figure_front() + tape_band(68, 208, 28, 8) + marker(82, 212),
    ),
    "skin-chest": wrap(
        "Adipometer · chest",
        figure_front() + caliper(128, 108, -28) + marker(112, 112),
    ),
    "skin-midaxillary": wrap(
        "Adipometer · midaxillary",
        figure_side() + caliper(138, 128, -10) + marker(122, 128),
    ),
    "skin-triceps": wrap(
        "Adipometer · triceps",
        figure_back() + caliper(178, 128, 8) + marker(156, 130),
    ),
    "skin-subscapular": wrap(
        "Adipometer · subscapular",
        figure_back() + caliper(128, 108, -35) + marker(112, 104),
    ),
    "skin-abdomen": wrap(
        "Adipometer · abdomen",
        figure_front() + caliper(132, 148, 8) + marker(110, 148),
    ),
    "skin-suprailiac": wrap(
        "Adipometer · suprailiac",
        figure_front() + caliper(148, 164, -18) + marker(124, 162),
    ),
    "skin-thigh": wrap(
        "Adipometer · thigh",
        figure_front() + caliper(118, 212, 12) + marker(92, 214),
    ),
    "map-front": wrap(
        "Front landmarks",
        figure_front()
        + marker(100, 62)
        + marker(100, 111)
        + marker(100, 148)
        + marker(100, 171)
        + marker(46, 128)
        + marker(82, 212)
        + marker(110, 148)
        + marker(124, 162),
    ),
    "map-back": wrap(
        "Back landmarks",
        figure_back() + marker(156, 130) + marker(112, 104),
    ),
    "map-side": wrap(
        "Side landmarks",
        figure_side() + marker(122, 128),
    ),
}


def png_rgba(width: int, height: int, pixels: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(b"\x00" + pixels[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def make_icon(size: int) -> bytes:
    px = bytearray(size * size * 4)
    cx = cy = size / 2

    def setp(x: int, y: int, r: int, g: int, b: int, a: int = 255) -> None:
        if 0 <= x < size and 0 <= y < size:
            i = (y * size + x) * 4
            px[i : i + 4] = bytes((r, g, b, a))

    radius = (size * 0.48) ** 2
    for y in range(size):
        for x in range(size):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy <= radius:
                setp(x, y, 28, 22, 18)
            else:
                setp(x, y, 246, 239, 228, 0)

    for i in range(220):
        ang = math.radians(40 + i * 1.2)
        rr = size * 0.28
        x = int(cx + rr * math.cos(ang))
        y = int(cy + rr * math.sin(ang) * 0.55 + size * 0.04)
        for ox in range(-2, 3):
            for oy in range(-2, 3):
                setp(x + ox, y + oy, 201, 162, 39)

    for t in range(40):
        x = int(cx + 4)
        y = int(cy - size * 0.12 + t)
        setp(x, y, 212, 120, 90)
        setp(x - t // 3, y + 8, 61, 74, 85)
        setp(x + t // 3, y + 8, 61, 74, 85)
    return png_rgba(size, size, bytes(px))


def main() -> None:
    GUIDES.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)
    for name, svg in SITES.items():
        (GUIDES / f"{name}.svg").write_text(svg, encoding="utf-8")
    (ICONS / "apple-touch-icon.png").write_bytes(make_icon(180))
    (ICONS / "icon-192.png").write_bytes(make_icon(192))
    (ICONS / "icon-512.png").write_bytes(make_icon(512))
    print(f"Wrote {len(SITES)} SVGs and icons")


if __name__ == "__main__":
    main()
