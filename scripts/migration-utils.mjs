import path from "node:path";

export const SITE = "https://www.ibglab.org";

export const CHROME_TEXT = new Set([
  "Izhar Bar-Gad's Lab at Bar-Ilan University",
  "IBG Lab",
  "About Us",
  "Lab Members",
  "Courses",
  "Pictures",
  "Software",
  "Contact",
  "Home",
  "Us",
  "Publications",
  "News",
  "CV",
  "More",
  "Log In",
  "All Posts",
  "See All",
]);

export const normalizeSpace = (value = "") => value.replace(/\s+/g, " ").trim();

export const stripSlash = (value) => value.replace(/\/+$/, "");

export function targetPathFor(url) {
  const parsed = new URL(url, SITE);
  if (stripSlash(parsed.href) === SITE) return "/";
  return `${parsed.pathname.replace(/\/+$/, "")}/`;
}

export function titleFromPath(targetPath) {
  if (targetPath === "/") return "Israel Bar-Gad Lab";
  return targetPath
    .replace(/^\/|\/$/g, "")
    .split("/")
    .pop()
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function sectionFor(targetPath) {
  if (targetPath.startsWith("/post/")) return "Road trip blog";
  if (targetPath.includes("sda-2025")) return "SDA 2025";
  if (targetPath.includes("sda-")) return "Courses";
  if (targetPath.includes("lab-trip") || targetPath.includes("ein-gedi") || targetPath.includes("roadtrip")) return "Gallery";
  if (targetPath === "/us/") return "People";
  if (targetPath === "/publications/") return "Publications";
  if (targetPath === "/news/" || targetPath === "/items/") return "News";
  return "IBG Lab";
}

export function normalizeInternalUrl(href) {
  try {
    const parsed = new URL(href, SITE);
    if (parsed.hostname.endsWith(".filesusr.com")) return `/_files${parsed.pathname}`;
    if (parsed.origin !== new URL(SITE).origin) return href;
    const cleanPath = parsed.pathname.replace(/\/$/, "");
    if (/\.(pdf|docx?|xlsx?|pptx?|zip)$/i.test(cleanPath)) return cleanPath;
    return targetPathFor(parsed.href);
  } catch {
    return href;
  }
}

export function isInternalUrl(href) {
  try {
    const parsed = new URL(href, SITE);
    return parsed.origin === new URL(SITE).origin;
  } catch {
    return false;
  }
}

export function filterContentBlocks(blocks) {
  const seen = new Set();
  return blocks
    .map((block) => ({ ...block, text: normalizeSpace(block.text) }))
    .filter((block) => {
      if (!block.text || CHROME_TEXT.has(block.text)) return false;
      if (/^©\s+\d{4}\s+Izhar Bar-Gad's lab/i.test(block.text)) return false;
      if (/^\d+\s+min read$/i.test(block.text)) return false;
      const key = `${block.kind}:${block.text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizeWixMedia(url) {
  if (!url) return "";
  let clean = url.replace(/&amp;/g, "&");
  try {
    const parsed = new URL(clean);
    const nested = parsed.searchParams.get("url");
    if (nested) clean = decodeURIComponent(nested);
  } catch {}

  try {
    const parsed = new URL(clean);
    if (parsed.hostname !== "static.wixstatic.com" || !parsed.pathname.startsWith("/media/")) {
      return clean.split("#")[0];
    }
    const originalPath = parsed.pathname.split("/v1/")[0];
    return `${parsed.origin}${originalPath}`;
  } catch {
    return clean.split("#")[0];
  }
}

export function assetNameFromUrl(url) {
  const parsed = new URL(url);
  const base = path.basename(parsed.pathname).replace(/[^\w.-]/g, "-");
  if (/\.(jpg|jpeg|png|webp|gif|pdf)$/i.test(base)) return base;
  return `${base || "asset"}.jpg`;
}

export function localTargetCandidates(urlPath, distDir) {
  const raw = urlPath.split("#")[0].split("?")[0];
  if (raw === "/") return [path.join(distDir, "index.html")];
  const clean = raw.replace(/\/$/, "");
  if (!clean) return [];
  const withoutSlash = clean.replace(/^\//, "").replace(/\/$/, "");
  return [
    path.join(distDir, withoutSlash),
    path.join(distDir, withoutSlash, "index.html"),
    path.join(distDir, `${withoutSlash}.html`),
  ];
}
