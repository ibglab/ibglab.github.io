import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import sharp from "sharp";

const root = process.cwd();
const pagesPath = path.join(root, "src/content/pages.json");
const rawDir = path.join(root, "extracted/raw");
const mediaDir = path.join(root, "public/media");
const pages = JSON.parse(await fs.readFile(pagesPath, "utf8"));

function originalMediaUrl(src) {
  const match = src.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+)/);
  return match?.[1];
}

function localFilename(sourceUrl) {
  return sourceUrl.split("/").pop().replace("~mv2", "-mv2");
}

async function download(image) {
  const target = path.join(mediaDir, image.localFilename);
  try {
    await fs.access(target);
  } catch {
    const response = await fetch(image.sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed ${response.status}: ${image.sourceUrl}`);
    }
    await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  }

  const metadata = await sharp(target).metadata();
  return {
    sourceUrl: image.sourceUrl,
    localPath: `/media/${image.localFilename}`,
    alt: "",
    caption: "",
    width: metadata.width,
    height: metadata.height,
  };
}

for (const page of pages.filter((entry) => entry.targetPath.startsWith("/post/"))) {
  const slug = page.targetPath.replace(/^\/post\/|\/$/g, "");
  const rawPath = path.join(rawDir, `post-${slug}.html`);
  const html = await fs.readFile(rawPath, "utf8");
  const $ = cheerio.load(html);
  const pinUrl = `https://www.ibglab.org/post/${slug}`;
  const sourceUrls = [];

  $(`img[data-pin-url="${pinUrl}"][data-hook="gallery-item-image-img"]`).each((_, element) => {
    const sourceUrl = originalMediaUrl($(element).attr("src") ?? "");
    if (sourceUrl && !sourceUrls.includes(sourceUrl)) sourceUrls.push(sourceUrl);
  });

  if (!sourceUrls.length) continue;

  const images = sourceUrls.map((sourceUrl) => ({
    sourceUrl,
    localFilename: localFilename(sourceUrl),
  }));
  page.images = await Promise.all(images.map(download));
  page.imageUrls = page.images.map((image) => image.sourceUrl);
  console.log(`${page.targetPath}: imported ${page.images.length} images`);
}

await fs.writeFile(pagesPath, `${JSON.stringify(pages, null, 2)}\n`);
