# IBG Lab Website Migration

This repository is the local GitHub Pages replacement for the Wix site at `https://www.ibglab.org/`.

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

## Publication Guardrail

The migration plan calls for local review before publication. Do not create the GitHub repository, enable GitHub Pages, or change DNS until the local site has been reviewed and explicitly approved.

## DNS Notes

- Intended custom domain: `www.ibglab.org`
- DNS manager from the migration plan: Wix
- Email provider: unknown

Before DNS cutover, confirm that MX/email records are not touched and that Wix remains active for any domain/DNS/email services still needed.
