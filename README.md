# Gingerbeard Weather (GBW)

GBW is a mobile-first weather dashboard built around a 24-hour scrub-able timeline. It currently uses Open-Meteo in the browser and device geolocation, with a fallback location if permission is unavailable.

## Release files

- `index.html` — full GBW app / PWA.
- `manifest.webmanifest` + `sw.js` — installable web-app support.
- `gbw-mark.svg` — GBW app mark.
- `gbw-widget.js` — reusable `<gingerbeard-weather>` Web Component.
- `widget-demo.html` — standalone embed example.
- `Dockerfile` + `nginx.conf` — Railway deployment.
- `.github/workflows/pages.yml` — GitHub Pages deployment.

## Run locally

Because geolocation and service workers work best on a secure origin or localhost, do not test the final release by opening `index.html` directly as a `file://` URL.

One easy local server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy with GitHub Pages

1. Create a GitHub repository and copy these files into its root.
2. Commit and push to `main`.
3. In GitHub: **Settings → Pages → Source → GitHub Actions**.
4. The included workflow deploys the repository as a static HTTPS site.

Once live, the browser can request device location and users can install GBW to their home screen as a PWA.

## Deploy with Railway

1. Push the folder to GitHub.
2. In Railway, create a new project from that GitHub repository.
3. Railway will detect the included `Dockerfile`.
4. Deploy, then create a public Railway domain (or attach your own domain).

The container serves GBW with nginx.

## Embed GBW in another project

### Fastest: iframe

```html
<iframe
  src="https://YOUR-GBW-DOMAIN/?embed=1"
  style="width:100%;height:760px;border:0;border-radius:20px"
  allow="geolocation">
</iframe>
```

### Reusable Web Component

Copy `gbw-widget.js` into the other project, or host it from the GBW deployment:

```html
<script src="https://YOUR-GBW-DOMAIN/gbw-widget.js"></script>

<gingerbeard-weather
  src="https://YOUR-GBW-DOMAIN/"
  height="760">
</gingerbeard-weather>
```

That keeps GBW isolated from the parent project's CSS and JavaScript.

## AI-group integration

For internal AI projects, treat GBW as a small standalone capability rather than copying its full source into every project:

```html
<gingerbeard-weather src="https://weather.your-domain.com/"></gingerbeard-weather>
```

This lets you improve GBW once and every project that embeds it receives the updated weather UI automatically.

## Next architecture step

Version 1.0 is intentionally client-side. If GBW grows beyond friends/internal projects, move third-party weather requests behind a tiny `/api/weather` service. That gives one stable JSON contract for the app/widget and makes it easy to combine Open-Meteo, NWS alerts, or other providers later without rewriting the UI.
