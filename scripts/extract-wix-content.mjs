import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { chromium } from "playwright";
import sharp from "sharp";
import {
  assetNameFromUrl,
  CHROME_TEXT,
  filterContentBlocks,
  normalizeInternalUrl,
  normalizeSpace,
  normalizeWixMedia,
  sectionFor,
  SITE,
  stripSlash,
  targetPathFor,
  titleFromPath,
} from "./migration-utils.mjs";

const ROOT = process.cwd();
const NOW = new Date().toISOString();
const parser = new XMLParser({ ignoreAttributes: false });
const FILESUSR_ORIGIN = "https://f4683542-dfd8-4d65-9b82-a429f27e7109.filesusr.com";

const dirs = [
  "data",
  "extracted/raw",
  "extracted/content",
  "extracted/assets",
  "public/media",
  "public/_files",
  "src/content",
];

for (const dir of dirs) {
  await mkdir(path.join(ROOT, dir), { recursive: true });
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function fileSourceCandidates(localHref) {
  const cleanHref = localHref.replace(/\/$/, "");
  const candidates = [`${SITE}${cleanHref}`];
  if (cleanHref.startsWith("/_files/")) {
    candidates.push(`${FILESUSR_ORIGIN}${cleanHref.replace(/^\/_files/, "")}`);
  }
  return candidates;
}

async function loadSitemapUrls() {
  const indexXml = await fetchText(`${SITE}/sitemap.xml`);
  await writeFile(path.join(ROOT, "extracted/raw/sitemap.xml"), indexXml);
  const index = parser.parse(indexXml);
  const sitemaps = asArray(index.sitemapindex?.sitemap).map((entry) => entry.loc).filter(Boolean);

  const urls = [];
  for (const sitemapUrl of sitemaps) {
    const xml = await fetchText(sitemapUrl);
    const filename = new URL(sitemapUrl).pathname.replace(/^\//, "");
    await writeFile(path.join(ROOT, "extracted/raw", filename), xml);
    const parsed = parser.parse(xml);
    for (const entry of asArray(parsed.urlset?.url)) {
      if (!entry.loc) continue;
      urls.push({
        sourceUrl: entry.loc,
        lastmod: entry.lastmod ?? null,
        sitemap: sitemapUrl,
        sitemapImages: asArray(entry["image:image"]).map((image) => image["image:loc"]).filter(Boolean),
      });
    }
  }

  return dedupeBy(urls, (entry) => stripSlash(entry.sourceUrl));
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function dedupeBy(items, keyFn) {
  const seen = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

function safeName(url) {
  const parsed = new URL(url);
  const clean = parsed.pathname.replace(/^\/$/, "home").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "");
  return clean || "home";
}

async function extractPage(browser, item) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];

  try {
    await page.goto(item.sourceUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.evaluate(async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const step = Math.max(450, Math.floor(window.innerHeight * 0.75));
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await delay(120);
      }
      window.scrollTo(0, 0);
      await delay(250);
    });

    const html = await page.content();
    await writeFile(path.join(ROOT, "extracted/raw", `${safeName(item.sourceUrl)}.html`), html);

    const extracted = await page.evaluate(() => {
      const clean = (value = "") => value.replace(/\s+/g, " ").trim();
      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const skipExact = new Set(["Home", "Us", "Publications", "News", "CV", "More", "Log In"]);
      const blocks = [];

      for (const element of document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6, main p, main li, [role='main'] h1, [role='main'] h2, [role='main'] h3, [role='main'] p, [role='main'] li, body h1, body h2, body h3, body h4, body h5, body h6, body p, body li")) {
        if (!isVisible(element)) continue;
        const text = clean(element.innerText || element.textContent || "");
        if (!text || text.length < 2 || skipExact.has(text)) continue;
        const previous = blocks[blocks.length - 1];
        if (previous?.text === text) continue;
        const tag = element.tagName.toLowerCase();
        blocks.push({
          kind: tag.startsWith("h") ? "heading" : tag === "li" ? "list" : "paragraph",
          level: tag.startsWith("h") ? Number(tag.slice(1)) : null,
          text,
        });
      }

      const links = [...document.querySelectorAll("a[href]")]
        .filter(isVisible)
        .map((link) => ({
          href: link.href,
          text: clean(link.innerText || link.getAttribute("aria-label") || link.href),
        }))
        .filter((link) => link.href && link.text);

      const imageUrls = new Set();
      const images = [];
      for (const image of document.querySelectorAll("img")) {
        if (!isVisible(image)) continue;
        const src = image.currentSrc || image.src || image.getAttribute("data-src") || "";
        if (!src) continue;
        imageUrls.add(src);
        images.push({
          sourceUrl: src,
          alt: clean(image.alt || ""),
          caption: clean(image.closest("figure")?.querySelector("figcaption")?.innerText || ""),
        });
      }

      for (const element of document.querySelectorAll("[style*='background']")) {
        if (!isVisible(element)) continue;
        const background = window.getComputedStyle(element).backgroundImage;
        for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
          imageUrls.add(match[1]);
          images.push({ sourceUrl: match[1], alt: "", caption: "" });
        }
      }

      const metaDescription = document.querySelector("meta[name='description']")?.content || "";

      return {
        title: clean(document.title.replace(/\|.*$/, "")) || clean(document.querySelector("h1")?.innerText || ""),
        description: clean(metaDescription),
        blocks,
        links,
        images,
        text: clean(document.body.innerText || ""),
      };
    });

    const targetPath = targetPathFor(item.sourceUrl);
    const title = extracted.title || titleFromPath(targetPath);
    const pageRecord = {
      sourceUrl: item.sourceUrl,
      targetPath,
      title,
      description: extracted.description,
      language: "en",
      priority: targetPath === "/" ? 1 : targetPath.startsWith("/post/") ? 0.4 : 0.7,
      migrationStatus: "extracted",
      section: sectionFor(targetPath),
      isBlog: targetPath.startsWith("/post/"),
      lastmod: item.lastmod,
      extractedAt: NOW,
      blocks: thinBlocks(extracted.blocks),
      links: normalizeLinks(extracted.links),
      images: [],
      sitemapImages: item.sitemapImages,
      extractionErrors: errors,
    };

    await writeFile(path.join(ROOT, "extracted/content", `${safeName(item.sourceUrl)}.json`), JSON.stringify(pageRecord, null, 2));
    await writeFile(path.join(ROOT, "extracted/content", `${safeName(item.sourceUrl)}.md`), toMarkdown(pageRecord));
    return { pageRecord, imageCandidates: [...extracted.images, ...item.sitemapImages.map((sourceUrl) => ({ sourceUrl, alt: "", caption: "" }))] };
  } catch (error) {
    errors.push(error.message);
    return {
      pageRecord: {
        sourceUrl: item.sourceUrl,
        targetPath: targetPathFor(item.sourceUrl),
        title: titleFromPath(targetPathFor(item.sourceUrl)),
        description: "",
        language: "en",
        priority: 0.3,
        migrationStatus: "error",
        section: "IBG Lab",
        isBlog: item.sourceUrl.includes("/post/"),
        lastmod: item.lastmod,
        extractedAt: NOW,
        blocks: [],
        links: [],
        images: [],
        sitemapImages: item.sitemapImages,
        extractionErrors: errors,
      },
      imageCandidates: item.sitemapImages.map((sourceUrl) => ({ sourceUrl, alt: "", caption: "" })),
    };
  } finally {
    await page.close();
  }
}

function thinBlocks(blocks) {
  return filterContentBlocks(blocks).slice(0, 260);
}

function normalizeLinks(links) {
  return dedupeBy(
    links
      .map((link) => ({
        href: normalizeInternalUrl(link.href),
        text: normalizeSpace(link.text),
      }))
      .filter((link) => link.href && link.text && !CHROME_TEXT.has(link.text))
      .filter((link) => !link.href.includes("wix.com/stands-with-ukraine")),
    (link) => `${link.href}|${link.text}`,
  ).slice(0, 80);
}

function toMarkdown(page) {
  const lines = [`# ${page.title}`, "", `Source: ${page.sourceUrl}`, "", `Target: ${page.targetPath}`, ""];
  for (const block of page.blocks) {
    if (block.kind === "heading") lines.push(`${"#".repeat(Math.min(Math.max(block.level ?? 2, 2), 4))} ${block.text}`, "");
    else lines.push(block.text, "");
  }
  return `${lines.join("\n").trim()}\n`;
}

async function downloadAssets(pages, imageMap) {
  const manifest = [];
  const errors = [];
  const byUrl = new Map();

  for (const [targetPath, candidates] of imageMap.entries()) {
    for (const candidate of candidates) {
      const sourceUrl = normalizeWixMedia(candidate.sourceUrl);
      if (!sourceUrl || !/^https?:\/\//.test(sourceUrl)) continue;
      if (!sourceUrl.includes("wixstatic.com/media")) continue;
      const entry = byUrl.get(sourceUrl) ?? { sourceUrl, references: [], altTexts: new Set(), captions: new Set() };
      entry.references.push(targetPath);
      if (candidate.alt) entry.altTexts.add(candidate.alt);
      if (candidate.caption) entry.captions.add(candidate.caption);
      byUrl.set(sourceUrl, entry);
    }
  }

  for (const entry of byUrl.values()) {
    const filename = assetNameFromUrl(entry.sourceUrl);
    const extractedPath = path.join(ROOT, "extracted/assets", filename);
    const publicPath = path.join(ROOT, "public/media", filename);
    try {
      const buffer = await fetchBuffer(entry.sourceUrl);
      await writeFile(extractedPath, buffer);
      await writeFile(publicPath, buffer);
      let metadata = {};
      try {
        metadata = await sharp(buffer).metadata();
      } catch {}
      const record = {
        sourceUrl: entry.sourceUrl,
        localFilename: filename,
        localPath: `/media/${filename}`,
        pageReferences: [...new Set(entry.references)],
        altText: [...entry.altTexts][0] ?? "",
        caption: [...entry.captions][0] ?? "",
        byteSize: buffer.byteLength,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        downloadedAt: NOW,
      };
      manifest.push(record);
    } catch (error) {
      errors.push({ sourceUrl: entry.sourceUrl, pageReferences: entry.references, error: error.message });
    }
  }

  for (const page of pages) {
    page.images = manifest
      .filter((asset) => asset.pageReferences.includes(page.targetPath))
      .map((asset) => ({
        sourceUrl: asset.sourceUrl,
        localPath: asset.localPath,
        alt: asset.altText,
        caption: asset.caption,
        width: asset.width,
        height: asset.height,
      }));
  }

  await writeFile(path.join(ROOT, "extracted/image-manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(ROOT, "extracted/asset-errors.json"), JSON.stringify(errors, null, 2));
  return { manifest, errors };
}

async function downloadLinkedFiles(pages) {
  const manifest = [];
  const errors = [];
  const linkedFiles = new Map();

  for (const page of pages) {
    for (const link of page.links ?? []) {
      if (!link.href?.startsWith("/_files/")) continue;
      const href = link.href.replace(/\/$/, "");
      const entry = linkedFiles.get(href) ?? { href, pageReferences: new Set(), text: link.text };
      entry.pageReferences.add(page.targetPath);
      linkedFiles.set(href, entry);
    }
  }

  for (const entry of linkedFiles.values()) {
    const localPath = path.join(ROOT, "public", entry.href);
    let sourceUrl = "";
    try {
      try {
        const existing = await stat(localPath);
        manifest.push({
          sourceUrl: `${SITE}${entry.href}`,
          localPath: entry.href,
          linkText: entry.text,
          pageReferences: [...entry.pageReferences],
          byteSize: existing.size,
          downloadedAt: NOW,
          reused: true,
        });
        continue;
      } catch {}
      let buffer;
      let lastError;
      for (const candidate of fileSourceCandidates(entry.href)) {
        sourceUrl = candidate;
        try {
          buffer = await fetchBuffer(candidate);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!buffer) throw lastError ?? new Error("No download candidates succeeded");
      await mkdir(path.dirname(localPath), { recursive: true });
      await writeFile(localPath, buffer);
      manifest.push({
        sourceUrl,
        localPath: entry.href,
        linkText: entry.text,
        pageReferences: [...entry.pageReferences],
        byteSize: buffer.byteLength,
        downloadedAt: NOW,
      });
    } catch (error) {
      errors.push({
        sourceUrl,
        localPath: entry.href,
        pageReferences: [...entry.pageReferences],
        error: error.message,
      });
    }
  }

  await writeFile(path.join(ROOT, "extracted/file-manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(ROOT, "extracted/file-errors.json"), JSON.stringify(errors, null, 2));
  return { manifest, errors };
}

function reportText(pages) {
  const lines = ["# Text Verification", "", `Extraction timestamp: ${NOW}`, ""];
  for (const page of pages) {
    const ok = page.blocks.length > 0 && page.migrationStatus === "extracted";
    lines.push(`- ${ok ? "[pass]" : "[review]"} ${page.targetPath} - ${page.title} (${page.blocks.length} text blocks)`);
    if (page.extractionErrors.length) lines.push(`  - Errors: ${page.extractionErrors.join("; ")}`);
  }
  return `${lines.join("\n")}\n`;
}

async function readJsonIfPresent(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function sanitizeCachedPage(page, item) {
  const targetPath = targetPathFor(item.sourceUrl);
  return {
    ...page,
    sourceUrl: item.sourceUrl,
    targetPath,
    title: page.title || titleFromPath(targetPath),
    language: page.language || "en",
    priority: targetPath === "/" ? 1 : targetPath.startsWith("/post/") ? 0.4 : 0.7,
    section: sectionFor(targetPath),
    isBlog: targetPath.startsWith("/post/"),
    lastmod: item.lastmod,
    blocks: thinBlocks(page.blocks ?? []),
    links: normalizeLinks(page.links ?? []),
    sitemapImages: item.sitemapImages,
    extractionErrors: page.extractionErrors ?? [],
  };
}

async function writeContentOutputs(pages) {
  const sorted = [...pages].sort((a, b) => {
    if (a.targetPath === "/") return -1;
    if (b.targetPath === "/") return 1;
    return a.targetPath.localeCompare(b.targetPath);
  });
  await writeFile(path.join(ROOT, "src/content/pages.json"), JSON.stringify(sorted, null, 2));
  await writeFile(path.join(ROOT, "extracted/text-manifest.json"), JSON.stringify(sorted, null, 2));
  await writeFile(path.join(ROOT, "extracted/text-verification.md"), reportText(sorted));
  return sorted;
}

function reportImages(manifest, errors) {
  const lines = ["# Image Verification", "", `Extraction timestamp: ${NOW}`, ""];
  lines.push(`Downloaded images: ${manifest.length}`);
  lines.push(`Failed images: ${errors.length}`, "");
  for (const asset of manifest) {
    const ok = asset.byteSize > 0 && asset.width && asset.height;
    lines.push(`- ${ok ? "[pass]" : "[review]"} ${asset.localFilename} - ${asset.width ?? "?"}x${asset.height ?? "?"}, ${asset.byteSize} bytes`);
  }
  if (errors.length) {
    lines.push("", "## Errors", "");
    for (const error of errors) lines.push(`- ${error.sourceUrl}: ${error.error}`);
  }
  return `${lines.join("\n")}\n`;
}

function reportFiles(manifest, errors) {
  const lines = ["# File Verification", "", `Extraction timestamp: ${NOW}`, ""];
  lines.push(`Downloaded files: ${manifest.length}`);
  lines.push(`Failed files: ${errors.length}`, "");
  for (const file of manifest) {
    lines.push(`- [pass] ${file.localPath} - ${file.byteSize} bytes`);
  }
  if (errors.length) {
    lines.push("", "## Errors", "");
    for (const error of errors) lines.push(`- ${error.sourceUrl}: ${error.error}`);
  }
  return `${lines.join("\n")}\n`;
}

const sitemapItems = await loadSitemapUrls();
const inventory = sitemapItems.map((item) => ({
  sourceUrl: item.sourceUrl,
  targetPath: targetPathFor(item.sourceUrl),
  title: titleFromPath(targetPathFor(item.sourceUrl)),
  language: "en",
  priority: targetPathFor(item.sourceUrl) === "/" ? 1 : 0.6,
  migrationStatus: "pending",
  lastmod: item.lastmod,
}));

await writeFile(path.join(ROOT, "data/site-map.json"), JSON.stringify(inventory, null, 2));

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : sitemapItems.length;
const selectedItems = sitemapItems.slice(0, Number.isFinite(limit) ? limit : sitemapItems.length);
const fresh = process.argv.includes("--fresh");
const existingPages = await readJsonIfPresent(path.join(ROOT, "src/content/pages.json"), []);
const existingByPath = new Map(existingPages.map((page) => [page.targetPath, page]));

const browser = await chromium.launch({ headless: true });
const pages = [];
const imageMap = new Map();

for (const [index, item] of selectedItems.entries()) {
  const targetPath = targetPathFor(item.sourceUrl);
  const cached = existingByPath.get(targetPath);
  let pageRecord;
  let imageCandidates;
  if (!fresh && cached?.migrationStatus === "extracted" && cached.blocks?.length) {
    console.log(`Using cached ${index + 1}/${selectedItems.length}: ${item.sourceUrl}`);
    pageRecord = sanitizeCachedPage(cached, item);
    imageCandidates = [
      ...(pageRecord.images ?? []).map((image) => ({ sourceUrl: image.sourceUrl, alt: image.alt, caption: image.caption })),
      ...item.sitemapImages.map((sourceUrl) => ({ sourceUrl, alt: "", caption: "" })),
    ];
  } else {
    console.log(`Extracting ${index + 1}/${selectedItems.length}: ${item.sourceUrl}`);
    ({ pageRecord, imageCandidates } = await extractPage(browser, item));
  }
  pages.push(pageRecord);
  imageMap.set(pageRecord.targetPath, imageCandidates);
  await writeContentOutputs(pages);
}

await browser.close();

const sortedPages = await writeContentOutputs(pages);

const { manifest, errors } = await downloadAssets(sortedPages, imageMap);
const { manifest: fileManifest, errors: fileErrors } = await downloadLinkedFiles(sortedPages);
const failedFileLinks = new Set(fileErrors.map((error) => error.localPath));
if (failedFileLinks.size) {
  for (const page of sortedPages) {
    page.links = (page.links ?? []).filter((link) => !failedFileLinks.has(link.href));
  }
}

await writeContentOutputs(sortedPages);
await writeFile(path.join(ROOT, "extracted/image-verification.md"), reportImages(manifest, errors));
await writeFile(path.join(ROOT, "extracted/file-verification.md"), reportFiles(fileManifest, fileErrors));

console.log(`Extracted ${sortedPages.length} pages, downloaded ${manifest.length} images, and downloaded ${fileManifest.length} files.`);
