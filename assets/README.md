Placeholder solid-color PNGs so `app.json`'s icon/splash references resolve
and the app builds. Replace with real branding before shipping:

- `icon.png` — 1024x1024, no transparency (App Store requirement)
- `adaptive-icon.png` — 1024x1024 foreground layer for Android adaptive icons
- `splash.png` — 1284x2778 (or any tall aspect ratio; Expo letterboxes it)
- `favicon.png` — 48x48, for the web build
