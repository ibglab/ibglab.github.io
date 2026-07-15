# IBG Lab Website

## Project

- This is a static Astro 6 site using Node.js 22 and ESM JavaScript.
- Preserve the existing design and responsive behavior unless the user requests a change.
- Follow the existing code style, including two-space indentation.

## Repository

- Preserve unrelated working-tree changes.
- Do not edit generated directories such as `node_modules/`, `dist/`, or `.astro/`.
- Treat `extracted/` as migration evidence; do not edit it manually.
- Normal page content may be edited directly in `src/content/pages.json`.
- Run `npm run extract` only when the user explicitly requests a refresh from Wix because it can overwrite locally edited content.
- Put locally managed images and other public assets under `public/` and update their content references as needed.

## Development

- Install pinned dependencies with `npm ci` for a clean setup.
- Development server: `npm run dev`
- Tests: `npm test`
- Production build: `npm run build`
- Link validation: `npm run validate:links` after building
- For visual or layout changes, verify the affected pages in a real browser at the relevant viewport sizes. Capture screenshots when they help evaluate the change.
- Dependencies may be added or upgraded without prior approval. Use `npm install` so `package.json` and `package-lock.json` remain synchronized.

## Configuration

- Do not change deployment or site configuration without explicit user approval. This includes `.github/workflows/`, the domain/site settings in `astro.config.mjs`, and protected-course configuration.

## Documentation

- Update documentation when commands, content-editing workflows, routes, or deployment behavior change.

## Git workflow

- Do not create branches or pull requests unless explicitly requested.
- Do not commit or push automatically after ordinary edits.
- When the user asks to publish or push, commit and push directly to `origin/main`.
- Immediately before pushing, run `npm test`, `npm run build`, and then `npm run validate:links`.
- Review the staged files before committing.
- Use a concise, descriptive commit message.
- The site deploys through GitHub Pages after pushing to `main`.
