import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { protectedCourseForPath } from "./src/lib/protectedCourses.js";

export default defineConfig({
  site: "https://www.ibglab.org",
  integrations: [
    sitemap({
      filter: (page) => !protectedCourseForPath(new URL(page).pathname),
    }),
  ],
  output: "static",
});
