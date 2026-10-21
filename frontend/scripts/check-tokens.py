#!/usr/bin/env python3
"""
Every colour, shadow and radius class used in src/ must exist in the
compiled CSS. Tailwind drops unknown classes silently, so a typo in a
token name would otherwise produce no style and no error.

Run `npm run build` first (this reads dist/assets/*.css), then:
    python3 scripts/check-tokens.py
Exit code 1 if any class is used but not generated.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST_CSS = sorted((ROOT / "dist" / "assets").glob("*.css"))

PREFIXES = (
    "bg", "text", "border", "ring", "ring-offset", "from", "to", "via",
    "fill", "stroke", "outline", "divide", "placeholder", "accent",
    "shadow", "rounded", "decoration", "caret",
)
# Tailwind's own names that are legitimate and not part of our tokens.
CORE = {
    "bg-clip-padding", "bg-transparent", "bg-white", "bg-black",
    "text-white", "text-black", "text-left", "text-center", "text-right",
    "text-sm", "text-xs", "text-base", "text-lg", "text-xl", "text-2xl",
    "text-3xl", "text-4xl", "text-2xs", "text-ellipsis", "text-wrap",
    "text-balance", "text-nowrap", "text-inherit", "text-current",
    "text-justify", "text-start", "text-end",
    "border-0", "border-2", "border-4", "border-8", "border-b", "border-t",
    "border-l", "border-r", "border-x", "border-y", "border-solid",
    "border-dashed", "border-dotted", "border-none", "border-collapse",
    "border-separate", "border-spacing", "rounded-none", "rounded-full",
    "rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl",
    "rounded-3xl", "rounded-t", "rounded-b", "rounded-l", "rounded-r",
    "rounded-tl", "rounded-tr", "rounded-bl", "rounded-br", "ring-0",
    "ring-1", "ring-2", "ring-4", "ring-8", "ring-inset", "shadow-sm",
    "shadow", "shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl",
    "shadow-inner", "shadow-none", "border-color", "ring-offset-2",
    "border-b-0",
}
TOKEN = re.compile(
    r"(?<![\w-])((?:%s))-([a-z0-9][a-z0-9-]*)(?:/[\w\[\].%%]+)?(?![\w-])"
    % "|".join(re.escape(p) for p in sorted(PREFIXES, key=len, reverse=True))
)


def used_classes() -> dict:
    found = {}
    for path in SRC.rglob("*"):
        if path.suffix not in {".tsx", ".ts", ".jsx", ".js"}:
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for match in TOKEN.finditer(line):
                cls = match.group(0)
                # Keep the /opacity modifier: it is part of the generated selector.
                if cls in CORE or "[" in cls or cls.startswith("text-") and cls[5:].isdigit():
                    continue
                found.setdefault(cls, []).append(f"{path.relative_to(ROOT)}:{lineno}")
    return found


def generated_css() -> str:
    if not DIST_CSS:
        sys.exit("No build output found. Run `npm run build` first.")
    return "\n".join(p.read_text(encoding="utf-8") for p in DIST_CSS)


def main() -> int:
    css = generated_css()
    missing = {}
    for cls, where in used_classes().items():
        # A class is generated as `.<variant>\:<name>` (or bare `.<name>`).
        # Look for the name right after a `.` or an escaped `\:` variant
        # separator, and make sure it is not just a longer class name.
        # Class names only contain [a-z0-9-/], so escaping the slash is enough.
        selector = cls.replace("/", r"\\/")  # regex for a literal backslash + slash
        pattern = r"(?:(?<=\.)|(?<=\\:))" + selector + r"(?![\w\-])"
        if not re.search(pattern, css):
            missing[cls] = where

    if missing:
        print("Classes used in source but NOT generated (typo or undefined token):\n")
        for cls, where in sorted(missing.items()):
            print(f"  {cls:<34} {where[0]}  (+{len(where)-1} more)" if len(where) > 1
                  else f"  {cls:<34} {where[0]}")
        print(f"\n{len(missing)} problem class(es).")
        return 1
    print("All colour, shadow and radius classes resolve to generated CSS.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
