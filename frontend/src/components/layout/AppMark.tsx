import { useState } from "react";
import { Boxes } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Application mark.
 *
 * Drop the company logo at `public/brand/logo.svg` (or .png) and it is used
 * automatically. Until then — or if the file fails to load — a solid brand
 * tile is rendered instead, so the shell never shows a broken image.
 */

const LOGO_SRC = "/brand/logo.svg";

export function AppMark({
  className,
  size = "md",
  inverted = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Use on dark panels: white tile, brand-coloured glyph. */
  inverted?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const box =
    size === "lg" ? "h-10 w-10" : size === "sm" ? "h-6 w-6" : "h-8 w-8";

  const glyph =
    size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          inverted ? "bg-white text-brand-800" : "bg-primary text-primary-foreground",
          box,
          className,
        )}
      >
        <Boxes className={glyph} />
      </div>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Company logo"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-lg object-contain", box, className)}
    />
  );
}
