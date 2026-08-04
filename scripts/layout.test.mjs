import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");

test("page titles can use the full width of their header", () => {
  const globalHeadingRule = layout.match(/h1\s*\{(?<declarations>[^}]+)\}/)?.groups?.declarations;

  assert.ok(globalHeadingRule, "Missing global h1 rule");
  assert.match(globalHeadingRule, /max-width:\s*100%/);
  assert.doesNotMatch(globalHeadingRule, /max-width:\s*12ch/);
});
