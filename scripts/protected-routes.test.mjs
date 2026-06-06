import test from "node:test";
import assert from "node:assert/strict";

import { protectedCourseForPath } from "../src/lib/protectedCourses.js";

test("protects the blog archive, map, and individual posts", () => {
  for (const path of [
    "/roadtrip2021-blog/",
    "/roadtrip2021-map/",
    "/post/a-day-in-southern-oregon/",
  ]) {
    assert.equal(protectedCourseForPath(path)?.key, "blogs-2021");
  }
});

test("does not apply the blog password to unrelated pages", () => {
  assert.equal(protectedCourseForPath("/news/"), undefined);
});
