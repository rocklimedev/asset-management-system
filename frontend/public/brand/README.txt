Drop the company logo here as logo.svg (preferred) or logo.png.

  public/brand/logo.svg

src/components/layout/AppMark.tsx picks it up automatically across the
sidebar, mobile drawer and login screen. Until the file exists, a solid
brand-blue tile is shown instead - nothing breaks.

Use the 'dark background' (white / reversed) version of the logo: the
sidebar and login panel are deep navy. Square or near-square artwork
works best (it renders at 24/32/40px).

The favicon and PWA icons in public/ currently use the app's cube glyph on
brand blue (#0061FF). Replace pwa-*.png, apple-touch-icon.png and
favicon.svg once the final mark is available.
