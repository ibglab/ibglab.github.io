import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
const pageRenderer = fs.readFileSync("src/components/PageRenderer.astro", "utf8");
const homePage = fs.readFileSync("src/pages/index.astro", "utf8");

test("page titles can use the full width of their header", () => {
  const globalHeadingRule = layout.match(/h1\s*\{(?<declarations>[^}]+)\}/)?.groups?.declarations;

  assert.ok(globalHeadingRule, "Missing global h1 rule");
  assert.match(globalHeadingRule, /max-width:\s*100%/);
  assert.doesNotMatch(globalHeadingRule, /max-width:\s*12ch/);
});

test("home and media pages use the In the media label", () => {
  assert.match(homePage, /<a href="\/news\/">In the media<\/a>/);
  assert.match(pageRenderer, /\? "In the media"/);
});

test("news media keep their article link with the image", () => {
  assert.match(pageRenderer, /const newsImageCards/);
  assert.match(pageRenderer, /const visibleBlocks/);
  assert.match(pageRenderer, /const visibleBlocks = isNewsContentPage \? \[\] : page\.blocks \?\? \[\];/);
  assert.match(pageRenderer, /newsPublicationLinkIds/);
  assert.match(pageRenderer, /\.filter\(\(card\) => card\.link && !newsPublicationLinkIds\.has\(card\.link\.id\)\)/);
  assert.match(pageRenderer, /usedInlineLinkIds\.add\(card\.link\.id\)/);
  assert.match(pageRenderer, /news-media-grid/);
  assert.match(pageRenderer, /news-media-card/);
  assert.match(pageRenderer, /<a href=\{card\.link\.href\} aria-label=\{card\.link\.text\}>/);
});
