#!/usr/bin/env python3
"""
Checks the SP Syndicate design tokens in src/index.css against WCAG 2.2.

  Text pairs        must reach 4.5 : 1   (SC 1.4.3)
  Non-text pairs    must reach 3   : 1   (SC 1.4.11)

Run from the frontend folder:  python3 scripts/check-contrast.py
Exit code 1 if any pair fails, so it can gate CI.
"""
import colorsys
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "src" / "index.css"


def parse_block(css: str, selector: str) -> dict:
    """Return the custom properties declared in the first block matching selector."""
    start = css.index(selector + " {")
    body = css[start : css.index("\n}", start)]
    return {
        name: value.strip()
        for name, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", body, re.S)
    }


def resolve(name: str, *scopes: dict, depth: int = 0) -> str:
    """Follow var(--x) references across the scopes (dark overrides light)."""
    if not name.startswith("--"):
        name = "--" + name
    for scope in scopes:
        if name in scope:
            raw = scope[name]
            ref = re.fullmatch(r"var\((--[\w-]+)\)", raw)
            if ref and depth < 10:
                return resolve(ref.group(1), *scopes, depth=depth + 1)
            return raw
    raise KeyError(f"token {name} is not defined")


def to_rgb(triplet: str):
    """'243 56% 46%' or '0 0% 100%' -> (r, g, b) in 0..1."""
    parts = re.findall(r"[-\d.]+", triplet)
    h, s, l = float(parts[0]), float(parts[1]), float(parts[2])
    return colorsys.hls_to_rgb(h / 360, l / 100, s / 100)


def luminance(rgb) -> float:
    def channel(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a: str, b: str) -> float:
    la, lb = luminance(to_rgb(a)), luminance(to_rgb(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# (label, foreground token, background token, minimum ratio)
TEXT = 4.5
NON_TEXT = 3.0

PAIRS = [
    ("body text",            "foreground",            "background",       TEXT),
    ("card text",            "card-foreground",       "card",             TEXT),
    ("muted text on canvas", "muted-foreground",      "background",       TEXT),
    ("muted text on card",   "muted-foreground",      "card",             TEXT),
    ("muted text on muted",  "muted-foreground",      "muted",            TEXT),
    ("primary button text",  "primary-foreground",    "primary",          TEXT),
    ("primary as link text", "primary",               "card",             TEXT),
    ("accent text",          "accent-foreground",     "accent",           TEXT),
    ("secondary button",     "secondary-foreground",  "secondary",        TEXT),
    ("destructive button",   "destructive-foreground","destructive",      TEXT),
    ("success button",       "success-foreground",    "success",          TEXT),
    ("warning button",       "warning-foreground",    "warning",          TEXT),
    ("info button",          "info-foreground",       "info",             TEXT),
    ("success status text",  "success-strong",        "success-muted",    TEXT),
    ("warning status text",  "warning-strong",        "warning-muted",    TEXT),
    ("danger status text",   "destructive-strong",    "destructive-muted",TEXT),
    ("info status text",     "info-strong",           "info-muted",       TEXT),
    ("sidebar nav text",     "sidebar-foreground",    "sidebar",          TEXT),
    ("sidebar title",        "sidebar-strong",        "sidebar",          TEXT),
    ("sidebar group label",  "sidebar-muted",         "sidebar",          TEXT),
    ("sidebar active text",  "sidebar-accent-foreground", "sidebar-accent", TEXT),
    ("input edge",           "input",                 "background",       NON_TEXT),
    ("focus ring",           "ring",                  "background",       NON_TEXT),
    # Card borders are decorative edges (cards are also lifted by their
    # shadow and sit on a different surface), so they are not required to
    # reach 3:1. Components that need a visible boundary use "input" above.
    ("sidebar indicator",    "sidebar-indicator",     "sidebar",          NON_TEXT),
]


def main() -> int:
    css = CSS.read_text(encoding="utf-8")
    light = parse_block(css, ":root")
    dark = parse_block(css, ".dark")

    failures = 0
    for theme, scope_main, scope_alt in (
        ("light", light, dark),
        ("dark", dark, light),
    ):
        print(f"\n== {theme} theme ==")
        for label, fg, bg, minimum in PAIRS:
            try:
                fg_v = resolve(fg, scope_main, scope_alt)
                bg_v = resolve(bg, scope_main, scope_alt)
                r = ratio(fg_v, bg_v)
            except KeyError as err:
                print(f"  ERROR  {label:<24} {err}")
                failures += 1
                continue
            ok = r >= minimum
            failures += 0 if ok else 1
            mark = "pass " if ok else "FAIL "
            print(f"  {mark}  {label:<24} {r:5.2f} : 1   (min {minimum})")

    print(f"\n{failures} failing pair(s)" if failures else "\nAll pairs meet WCAG.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
