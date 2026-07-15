import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { pictureGalleries } from "../src/lib/pictureGalleries.js";

const pages = JSON.parse(fs.readFileSync("src/content/pages.json", "utf8"));
const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
const renderer = fs.readFileSync("src/components/PageRenderer.astro", "utf8");

test("Pictures reproduces the Wix gallery index in its original order", () => {
  assert.deepEqual(
    pictureGalleries.map(({ title, href }) => ({ title, href })),
    [
      { title: "June 2026", href: "/pictures/june-2026/" },
      { title: "Lab trip, April 2022", href: "/lab-trip-april-2022/" },
      { title: "Kfar Blum 2022", href: "/kfar-blum-2022/" },
      { title: "Lab trip, Dec. 2021", href: "/lab-trip-dec-2021/" },
      { title: "Lab trip, June 2021", href: "/lab-trip-june-2021/" },
      { title: "Lab trip, Feb 2021", href: "/lab-trip-feb-2021/" },
      { title: "Random years", href: "/pictures/us/" },
      { title: "Lab trip, Jan 2020", href: "/lab-trip-2019/" },
      { title: "Lab trip, Apr 2016", href: "/lab-trip-2016/" },
      { title: "Ein-Gedi conference, 2015", href: "/ein-gedi-15/" },
      { title: "Lab trip, Aug 2015", href: "/lab-trip-2015/" },
      { title: "Lab trip, Dec 2014", href: "/lab-trip-2014/" },
    ],
  );
});

test("Pictures links to migrated galleries and appears in the main menu", () => {
  const migratedPaths = new Set(pages.map((page) => page.targetPath));

  for (const gallery of pictureGalleries) {
    if (["/pictures/us/", "/pictures/june-2026/"].includes(gallery.href)) {
      continue;
    }
    assert.ok(migratedPaths.has(gallery.href), `Missing migrated gallery ${gallery.href}`);
  }

  assert.match(layout, /\{ href: "\/pictures\/", label: "Pictures" \}/);
  assert.match(renderer, /isPictureGallery/);
});

test("all public gallery images stay at or below 400 KiB", () => {
  const mediaFiles = fs.readdirSync("public/media");
  const oversized = mediaFiles
    .filter((name) => /\.(?:jpe?g|png|webp|gif)$/i.test(name))
    .map((name) => ({
      name,
      size: fs.statSync(`public/media/${name}`).size,
    }))
    .filter(({ size }) => size > 400 * 1024);

  assert.deepEqual(oversized, []);
});

test("June 2026 gallery includes every supplied image", () => {
  const pagePath = "src/pages/pictures/june-2026.astro";
  assert.ok(fs.existsSync(pagePath), "Missing June 2026 gallery page");

  const page = fs.readFileSync(pagePath, "utf8");
  const imageSources = [...page.matchAll(/localPath:\s*["']([^"']+)["']/g)]
    .map((match) => match[1]);

  assert.equal(imageSources.length, 4);
  for (const source of imageSources) {
    assert.match(source, /^\/media\/june-2026-/);
    assert.ok(fs.existsSync(`public${source}`), `Missing gallery image: ${source}`);
    assert.ok(
      fs.statSync(`public${source}`).size <= 400 * 1024,
      `Gallery image exceeds 400 KiB: ${source}`,
    );
  }
});
