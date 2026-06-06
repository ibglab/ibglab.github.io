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
      { title: "Lab trip, April 2022", href: "/copy-of-lab-trip-dec-2021/" },
      { title: "Kfar Blum 2022", href: "/copy-of-ein-gedi-2015/" },
      { title: "Lab trip, Dec. 2021", href: "/copy-of-lab-trip-jun-2021/" },
      { title: "Lab trip, June 2021", href: "/copy-of-lab-trip-2021/" },
      { title: "Lab trip, Feb 2021", href: "/copy-of-lab-trip-2020/" },
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
    if (gallery.href === "/pictures/us/") continue;
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
