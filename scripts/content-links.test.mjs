import test from "node:test";
import assert from "node:assert/strict";

import { labMembers } from "../src/lib/labMembers.js";
import { publicationInlineLinks } from "../src/lib/publicationInlineLinks.js";

test("Izhar Bar-Gad links to the CV page", () => {
  const izhar = labMembers.find((member) => member.name === "Izhar Bar-Gad, Ph.D.");

  assert.ok(izhar);
  assert.equal(izhar.href, "/cv/");
});

test("the 2025 facial tics publication links to its DOI", () => {
  assert.deepEqual(publicationInlineLinks[3], {
    label: "IEEE Journal of Biomedical and Health Informatics",
    href: "https://doi.org/10.1109/JBHI.2024.3488285",
  });
});
