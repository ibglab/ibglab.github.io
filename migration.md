# IBG Lab Wix-to-GitHub Migration Runbook

This is the reproducible record of the migration performed for
`https://www.ibglab.org/`. It is written so the site can be rebuilt from Wix in
one Codex session with one initial prompt, followed only by credentials or
approval when GitHub, protected Wix pages, or DNS require them.

## One-Prompt Migration

Give Codex this prompt from an empty local workspace:

```text
Migrate https://www.ibglab.org from Wix into a complete Astro static website.

Use this runbook as the authoritative specification:
/Users/ibg/WWW/migration.md

Work autonomously from extraction through implementation, browser verification,
Git commit, GitHub publication, and GitHub Pages setup. Ask only when a password,
GitHub login, external-side-effect confirmation, or DNS approval is genuinely
required.

Requirements:
- Put the final Git repository directly in /Users/ibg/WWW/.
- Create or use the public GitHub repository ibglab/ibglab.github.io.
- Preserve the existing Wix URLs wherever practical.
- Use the original Wix text, images, downloads, blog galleries, people, alumni,
  publications, courses, software, news, contact details, and road-trip map.
- Use only top-level navigation: Home, Publications, People, News, Blog,
  Courses, Software, Contact. Do not include CV.
- Brand the site as "IBG Lab" with the subtitle
  "Computational Basal Ganglia Research".
- Add the three original Wix research images as separated diamonds in the
  header.
- Protect SDA 2025, DS-NS 2025, BS-CS 2025, and the 2021 Blog area with the
  passwords documented below. The prompt must disappear after successful
  unlock, and one unlock must persist for that section during the browser
  session.
- Standardize every page to one visible H1 with consistent typography.
- Keep manuscript and course-resource links attached to their names rather than
  listing URLs separately.
- Build and test desktop and mobile layouts in a real browser.
- Run tests, production build, link validation, broken-image checks, heading
  audits, console checks, and sitemap/noindex checks.
- Do not change DNS, claim www.ibglab.org, add public/CNAME, cancel Wix, or alter
  email records until I explicitly approve the final cutover.
- Commit the approved migration and push it to GitHub. Configure a GitHub Actions
  Pages workflow, but keep domain cutover as a separately approved step.

Do not stop after scaffolding or extraction. Continue until the complete local
site is verified and the GitHub publication is finished or blocked only by a
credential/confirmation that you explicitly request.
```

## Site-Specific Inputs

| Item | Value |
| --- | --- |
| Wix site | `https://www.ibglab.org/` |
| Custom domain | `www.ibglab.org` |
| GitHub owner | `ibglab` |
| GitHub repository | `ibglab.github.io` |
| Local repository | `/Users/ibg/WWW/` |
| DNS manager | Wix |
| Framework | Astro static output |
| Node version | Read from `.nvmrc` |
| Primary branch | `main` |
| Contact email | `izhar.bar-gad@biu.ac.il` |

### Protected Areas

These are course-sharing passwords, not high-security credentials:

| Area | Password | Protected routes |
| --- | --- | --- |
| SDA 2025 | `SDA2025` | `/sda-2025/` and `/sda-2025-*` |
| DS-NS 2025 | `DSNS2025` | `/ds-ns-2025/` |
| BS-CS 2025 | `BSCS2025` | `/bs-cs-2025/` |
| Road-trip Blog | `BLOGS2021` | `/roadtrip2021-blog/`, `/roadtrip2021-map/`, `/post/*` |

The static site stores SHA-256 hashes in
`src/lib/protectedCourses.js`. Because GitHub Pages is static hosting, this is a
client-side visibility gate, not server authentication. It discourages casual
access but cannot protect truly sensitive material.

## Completed Architecture

```text
/Users/ibg/WWW/
├── .git/
├── .github/workflows/deploy.yml
├── .gitignore
├── .nvmrc
├── README.md
├── MIGRATION_PLAN.md
├── migration.md
├── astro.config.mjs
├── package.json
├── package-lock.json
├── data/site-map.json
├── extracted/
│   ├── content/
│   ├── manifests and verification reports
│   └── optional ignored raw/assets archives
├── public/
│   ├── media/
│   ├── _files/
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   ├── extract-wix-content.mjs
│   ├── download-assets.mjs
│   ├── import-blog-galleries.mjs
│   ├── validate-extraction.mjs
│   ├── validate-links.mjs
│   └── tests
└── src/
    ├── components/
    ├── content/pages.json
    ├── layouts/BaseLayout.astro
    ├── lib/
    └── pages/
```

Normal page content is primarily in `src/content/pages.json`. Hand-maintained
structured content is in `src/lib/`, including course data, people/alumni,
software, protected-route configuration, and publication link mappings.

## Exact Migration Procedure

### 1. Inventory the Wix Site

1. Read the Wix sitemap and crawl visible navigation, footer links, buttons,
   galleries, course subpages, software subpages, news, blog posts, and files.
2. Save the intended route inventory in `data/site-map.json`.
3. Preserve existing paths where practical because the old site already has
   external links and bookmarks.
4. Detect password-protected pages and request the relevant password rather than
   omitting those pages.

Important routes discovered in this migration included:

- Main pages: `/`, `/publications/`, `/us/`, `/news/`, `/courses/`,
  `/software/`, `/contact/`
- People alias: `/lab-members/`
- Blog archive: `/roadtrip2021-blog/`
- Blog map: `/roadtrip2021-map/`
- Blog posts: `/post/*`
- Current protected courses: `/sda-2025*`, `/ds-ns-2025/`, `/bs-cs-2025/`
- Historic courses and their internal pages
- Software detail pages and downloadable files

### 2. Capture Rendered Wix Content

Do not rely only on `curl`. Wix lazy-loads content and app widgets.

1. Use Playwright or the in-app browser.
2. Load each page with a desktop viewport.
3. Scroll through the full page so lazy content renders.
4. Save rendered snapshots to `extracted/raw/`.
5. Extract cleaned text, headings, links, image references, and metadata into
   `extracted/content/` and `src/content/pages.json`.
6. Filter Wix navigation, footer, Ukraine banner, duplicate app chrome, and
   unrelated recommendation widgets.

Run:

```bash
npm install
npm run extract
npm run validate:extraction
```

After manual corrections begin, do not rerun `npm run extract` blindly because
it may overwrite reviewed content.

### 3. Download Original Media and Files

Wix commonly serves transformed URLs such as:

```text
...jpg/v1/fill/w_740,h_500,.../image.webp
```

Normalize them back to the original:

```text
https://static.wixstatic.com/media/<media-id>~mv2.jpg
```

Store:

- Images in `public/media/`
- PDFs, DOC/DOCX, archives, and other downloads under `public/_files/`
- Extraction evidence in `extracted/`

Verify every local asset is non-empty and decodable. GitHub rejects individual
files larger than 100 MB, so audit file sizes before committing.

### 4. Recover Blog Galleries Correctly

The normal page extractor found only one lead image per blog post. The complete
galleries were embedded in the saved rendered HTML.

For each `extracted/raw/post-*.html`:

1. Select images whose `data-pin-url` equals that post URL.
2. Prefer elements with
   `data-hook="gallery-item-image-img"` to avoid blurred preload duplicates.
3. Normalize each Wix URL to the original media URL.
4. Preserve DOM/gallery order.
5. Download the originals.
6. Replace that post's `images` and `imageUrls` arrays in
   `src/content/pages.json`.

The repeatable implementation is:

```bash
node scripts/import-blog-galleries.mjs
```

The completed migration has 270 images across 19 posts. Two posts genuinely
have only a single cover image; the others contain galleries of 7-27 images.
Render blog images at their natural proportions rather than forcing a 4:3 crop.

### 5. Recover the Road-Trip Map

The Wix road-trip map is a Google Map widget, not an ordinary image. The generic
image extractor incorrectly identified Wix chrome as map content.

Correct process:

1. Open `https://www.ibglab.org/roadtrip2021-map` in Playwright.
2. Wait for the cross-origin iframe titled `Google Maps`.
3. Confirm its markers render. The migrated source showed 12 markers across the
   western United States.
4. Close any open marker popup.
5. Capture the map iframe to `public/media/roadtrip-2021-map.png`.
6. Render that image only on `/roadtrip2021-map/`.
7. Do not render the Wix chrome PNGs as map images.

This produces a stable static representation without embedding Wix's private
Google Maps client configuration.

### 6. Build the Astro Site

Core implementation:

- `src/layouts/BaseLayout.astro`: metadata, header, navigation, footer, global
  responsive design, and protected-route wrapper.
- `src/components/PageRenderer.astro`: generic extracted pages, inline links,
  news/blog behavior, galleries, and road-trip map.
- `src/components/LabMembersPage.astro`: current members and alumni.
- `src/components/CoursePasswordGate.astro`: password prompt and unlock flow.
- `src/pages/[...slug].astro`: generated migrated routes.
- `src/pages/[course].astro`: structured course landing pages.
- Dedicated pages for contact, courses, software, software details, and other
  custom layouts.

### 7. Apply the Approved IBG Lab Design

Header requirements:

- Brand: `IBG Lab`
- Subtitle: `Computational Basal Ganglia Research`
- Top navigation only:
  `Home`, `Publications`, `People`, `News`, `Blog`, `Courses`, `Software`,
  `Contact`
- No `CV` navigation item
- No footer navigation menu
- Three original Wix research images shown as rotated diamonds
- Use enough horizontal gap to account for the larger transformed bounding box
  of a rotated square; verify transformed boxes do not overlap

Page requirements:

- Exactly one visible H1 per page
- Same H1 font family, weight, and sizing across pages
- Remove duplicate labels such as `People` plus `Lab Members`
- Remove empty hero/image whitespace
- Use responsive widths and confirm no horizontal overflow

### 8. Preserve Content Semantics

- Publications: manuscript titles themselves are hyperlinks.
- Course lectures/resources: resource names themselves are hyperlinks.
- News: linked item names remain inline; local images must not use broken Wix
  transformed URLs.
- Courses index: list one top-level course entry per course/year, not every
  internal lecture or assignment page.
- Software: reproduce all software entries and relevant detail/download links.
- People: include current lab members and alumni.
- Contact: include the get-in-touch mail form, address, contact details, and
  Google map.

### 9. Implement Protected Areas

1. Store only SHA-256 hashes in `src/lib/protectedCourses.js`.
2. Match every route belonging to a protected section.
3. Exclude protected routes from the generated sitemap.
4. Add `noindex, nofollow` metadata.
5. On success:
   - Remove the password prompt from the DOM.
   - Reveal content.
   - Store section access in `sessionStorage`.
6. Use one access key for the entire Blog section so archive, posts, and map do
   not prompt repeatedly.
7. Test incorrect and correct passwords in a real browser.

### 10. Validate End to End

Required commands:

```bash
npm test
npm run build
npm run validate:links
```

Required audits:

- Every generated HTML file has exactly one literal H1.
- Every local image and download exists.
- Representative pages have no broken images.
- Blog gallery counts match recovered Wix gallery counts.
- Protected prompts disappear after unlock.
- Protected routes remain unlocked while navigating within the same section.
- Protected routes are absent from sitemap output.
- Header diamonds do not overlap at desktop or mobile widths.
- No horizontal overflow.
- Browser console has no warnings or errors.
- Contact form and map render.
- Desktop and mobile screenshots look coherent.

At the end of the first migration, the verified baseline was:

- 85 generated pages
- 7 passing automated tests
- Link validation passing for all 85 HTML files
- 270 blog images with no missing local files

## Git and GitHub Publication

### Local Repository

The approved site was committed locally as:

```text
22119d4 feat: migrate IBG Lab website from Wix
```

The authoritative working tree must be:

```text
/Users/ibg/WWW/
```

Ignored content includes:

```text
node_modules/
dist/
.astro/
extracted/assets/
extracted/raw/
```

The ignored extraction archives may remain on the workstation but should not be
required to build the site.

### Create and Push the Repository

Preferred public repository:

```text
https://github.com/ibglab/ibglab.github.io
```

If GitHub CLI is installed and authenticated:

```bash
cd /Users/ibg/WWW
gh repo create ibglab/ibglab.github.io \
  --public \
  --source=. \
  --remote=origin \
  --push
```

If using the existing SSH alias configured on this Mac:

```bash
cd /Users/ibg/WWW
git remote add origin git@github-lab:ibglab/ibglab.github.io.git
git push -u origin main
```

The remote repository must already exist before the SSH push. Confirm the SSH
identity with:

```bash
ssh -T github-lab
```

### GitHub Pages

`.github/workflows/deploy.yml`:

1. Checks out the repository.
2. Uses the Node version from `.nvmrc`.
3. Runs `npm ci`.
4. Runs tests.
5. Builds the Astro site.
6. Validates links.
7. Uploads `dist/`.
8. Deploys with GitHub Pages Actions.

In GitHub repository settings:

1. Open **Settings > Pages**.
2. Select **GitHub Actions** as the source.
3. Run or wait for the deployment workflow.
4. Verify the temporary GitHub Pages URL before changing DNS.

## Domain Cutover: Separate Approval Required

Do not add `public/CNAME` during the first repository publication. Do not change
Wix DNS until the GitHub Pages build is verified.

Only after explicit approval:

1. Configure the GitHub Pages custom domain as `www.ibglab.org`.
2. Add `public/CNAME` containing:

   ```text
   www.ibglab.org
   ```

3. In Wix DNS, change only the website records required for GitHub Pages.
4. Do not change nameservers or MX/email records.
5. Point `www` CNAME to `ibglab.github.io`.
6. If the apex domain is also used, configure GitHub's documented A/AAAA
   records and redirect behavior.
7. Wait for certificate issuance, then enable HTTPS enforcement.
8. Verify the site and email before unpublishing Wix.

Never cancel Wix domain registration, DNS, or email services merely because the
Wix website is being replaced.

## Current Status as of June 6, 2026

Complete:

- Wix crawl and extraction
- Astro implementation
- Content corrections
- People and alumni
- Publications, courses, software, news, contact, blog, galleries, and map
- Protected current courses and Blog
- Responsive header and design
- Local browser verification
- Automated tests, build, and link validation
- GitHub Pages workflow
- Local Git commit
- Repository copied to `/Users/ibg/WWW/`

Pending:

- Create `ibglab/ibglab.github.io` on GitHub
- Add `origin`
- Push `main`
- Confirm GitHub Actions deployment
- Approve and perform custom-domain/DNS cutover
- Verify HTTPS
- Unpublish the old Wix website only after the replacement is stable

## Definition of Done

- [ ] The repository exists at `/Users/ibg/WWW/`.
- [ ] `npm ci`, tests, build, and link validation pass.
- [ ] All approved pages, files, and galleries render locally.
- [ ] Protected sections behave correctly.
- [ ] GitHub repository `ibglab/ibglab.github.io` exists and contains `main`.
- [ ] GitHub Pages workflow is green.
- [ ] Temporary Pages URL works before DNS changes.
- [ ] User explicitly approves domain cutover.
- [ ] `www.ibglab.org` resolves to GitHub Pages with valid HTTPS.
- [ ] Email remains unaffected.
- [ ] Wix is unpublished or retained intentionally after final verification.
