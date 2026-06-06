import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  filterContentBlocks,
  localTargetCandidates,
  normalizeInternalUrl,
  normalizeWixMedia,
} from "./migration-utils.mjs";

test("normalizes Wix transformed media URLs to original media files", () => {
  const transformed = "https://static.wixstatic.com/media/bb640f_044e02682c78484a92ebaf9da1381268~mv2.jpg/v1/fill/w_344,h_258/bb640f_044e02682c78484a92ebaf9da1381268~mv2.webp";
  assert.equal(
    normalizeWixMedia(transformed),
    "https://static.wixstatic.com/media/bb640f_044e02682c78484a92ebaf9da1381268~mv2.jpg",
  );
});

test("filters Wix navigation chrome from extracted page blocks", () => {
  const blocks = [
    { kind: "paragraph", text: "Izhar Bar-Gad's Lab at Bar-Ilan University" },
    { kind: "heading", text: "IBG Lab" },
    { kind: "list", text: "About Us" },
    { kind: "paragraph", text: "Signal & Data Analysis in Neuroscience (27-505)" },
  ];
  assert.deepEqual(filterContentBlocks(blocks), [
    { kind: "paragraph", text: "Signal & Data Analysis in Neuroscience (27-505)" },
  ]);
});

test("maps absolute ibglab URLs to local paths", () => {
  assert.equal(normalizeInternalUrl("https://www.ibglab.org/publications"), "/publications/");
  assert.equal(
    normalizeInternalUrl("https://www.ibglab.org/_files/ugd/example.pdf/"),
    "/_files/ugd/example.pdf",
  );
  assert.equal(
    normalizeInternalUrl("https://f4683542-dfd8-4d65-9b82-a429f27e7109.filesusr.com/ugd/example.pdf"),
    "/_files/ugd/example.pdf",
  );
  assert.equal(normalizeInternalUrl("https://example.com/publications"), "https://example.com/publications");
});

test("returns iterable local candidates for the site root", () => {
  assert.deepEqual(localTargetCandidates("/", "/tmp/dist"), [path.join("/tmp/dist", "index.html")]);
});
