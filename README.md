# MeasureLab

iPhone-friendly progressive web app to log **self-taken** tape (cm) and adipometer / skinfold (mm) measures. Data stays in the browser (`IndexedDB`). Body-fat % is estimated when enough sites are filled (Jackson–Pollock 3-site / 7-site, US Navy tape, waist–hip ratio).

These numbers are estimates for personal tracking, not a medical diagnosis.

## Run on a computer, then open on iPhone

Service workers and “Add to Home Screen” need `http://`, not a `file://` URL.

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\serve.ps1
```

Or, if Python is installed:

```bash
cd app
python -m http.server 8080
```

1. Find this computer’s LAN IP (Windows: `ipconfig`, look for IPv4).
2. On the iPhone, open Safari to `http://YOUR_LAN_IP:8080`.
3. Share → **Add to Home Screen**.
4. Export a JSON backup from **Profile** now and then (clearing Safari data deletes logs).

## What to measure

Use the same side of the body every time (right side is the usual standard). Each field on **Log** has a **How to** panel with a placement picture and self-taken steps.

- **Tape:** neck, chest, waist (navel), hips, left/right arm, left/right thigh
- **Adipometer:** chest, midaxillary, triceps, subscapular, abdomen, suprailiac, thigh

Skip any site you cannot place reliably (especially subscapular and midaxillary without a mirror).

## Formulas

- **JP 3-site** (needs age + sex): men = chest, abdomen, thigh skinfolds; women = triceps, suprailiac, thigh
- **JP 7-site:** all seven skinfolds
- **US Navy:** neck + waist (+ hips for women) and profile height
- **Waist–hip ratio:** waist / hips

## Project layout

- `app/` — PWA (HTML/CSS/JS, guide SVGs, icons, service worker)
- `scripts/generate_guides.py` — regenerates placement illustrations and icons
