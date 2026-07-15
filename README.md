# IBG Lab Website

This repository contains the static Astro site published at `https://www.ibglab.org/`.

## Commands

- `npm install` installs the pinned project dependencies.
- `npm run extract` crawls the public Wix site, stores extraction evidence in `extracted/`, downloads local media, and refreshes `src/content/pages.json`.
- `npm run dev` starts the local editing preview.
- `npm run build` builds the static site into `dist/`.
- `npm run validate:extraction` checks that the extraction manifests and downloaded assets are usable.
- `npm run validate:links` checks local links and assets in `dist/`.

## Editing Content

Most normal page content lives in `src/content/pages.json`, generated from Wix. After you begin editing the migrated copy, avoid rerunning `npm run extract` unless you intentionally want to refresh from Wix and review overwritten generated text.

Gallery and page images are copied to `public/media/`. To add images locally, place files there and add them to the relevant page entry in `src/content/pages.json`.

## Deployment

Pushing to `main` runs the GitHub Pages workflow, which tests and builds the site, validates its links, and deploys the generated `dist/` output.
