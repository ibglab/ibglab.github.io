import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const homepage = fs.readFileSync("src/pages/index.astro", "utf8");
const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");

test("projects have a dedicated page and navigation tab", () => {
  assert.match(layout, /href:\s*"\/projects\/",\s*label:\s*"Projects"/);
  assert.ok(fs.existsSync("src/pages/projects.astro"), "Missing projects page");

  const projectsPage = fs.readFileSync("src/pages/projects.astro", "utf8");

  assert.doesNotMatch(projectsPage, />Research<\/p>/);
  assert.doesNotMatch(projectsPage, /<h1>Current projects<\/h1>/);
  assert.doesNotMatch(projectsPage, /Explore ongoing research at the IBG Lab\./);
  assert.match(projectsPage, /<h2[^>]*>NabuPD<\/h2>/);
  assert.match(projectsPage, /<h2[^>]*>LoCoPD<\/h2>/);
  assert.match(
    projectsPage,
    /Deciphering the Dynamics of Tics in a Rat Model of Tourette Syndrome/,
  );
  assert.match(projectsPage, /<h2[^>]*>Tourette Tics<\/h2>/);
  assert.match(projectsPage, /text-align:\s*justify/);
  assert.match(projectsPage, /text-align-last:\s*justify/);
  assert.equal(
    projectsPage.match(/class="project-description"/g)?.length,
    5,
    "Every project body paragraph should use full justification",
  );
  assert.match(projectsPage, /href="\/research\/nabupd-poster\.pdf"/);
  assert.match(projectsPage, /href="\/research\/locopd-poster\.pdf"/);
  assert.match(projectsPage, /href="\/research\/tic-dynamics-poster\.pdf"/);
  assert.ok(
    fs.existsSync("public/research/tic-dynamics-poster.pdf"),
    "Missing Tourette Tics poster PDF",
  );
});

test("project profiles are not displayed on the homepage", () => {
  assert.doesNotMatch(homepage, /class="projects"/);
  assert.doesNotMatch(homepage, /class="project-card"/);
});
