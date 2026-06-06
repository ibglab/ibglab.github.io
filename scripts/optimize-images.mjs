import { readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MEDIA_DIR = path.resolve("public/media");
const TARGET_BYTES = 400 * 1024;
const CONCURRENCY = 4;
const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

const jpegAttempts = [
  [1920, 82],
  [1920, 76],
  [1920, 70],
  [1600, 78],
  [1600, 72],
  [1600, 66],
  [1400, 74],
  [1400, 68],
  [1400, 62],
  [1200, 72],
  [1200, 66],
  [1200, 60],
  [1000, 68],
  [1000, 60],
  [800, 60],
];

const pngAttempts = [
  [1600, 256],
  [1400, 256],
  [1200, 256],
  [1000, 256],
  [1000, 128],
  [800, 128],
  [800, 64],
  [600, 64],
];

function resizedImage(filePath, maxDimension) {
  return sharp(filePath)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
}

async function compressJpeg(filePath) {
  let smallest;

  for (const [maxDimension, quality] of jpegAttempts) {
    const buffer = await resizedImage(filePath, maxDimension)
      .jpeg({
        quality,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: "4:2:0",
      })
      .toBuffer();
    if (!smallest || buffer.length < smallest.length) smallest = buffer;
    if (buffer.length <= TARGET_BYTES) return buffer;
  }

  return smallest;
}

async function compressPng(filePath) {
  let smallest;

  for (const [maxDimension, colours] of pngAttempts) {
    const buffer = await resizedImage(filePath, maxDimension)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
        colours,
        quality: 90,
      })
      .toBuffer();
    if (!smallest || buffer.length < smallest.length) smallest = buffer;
    if (buffer.length <= TARGET_BYTES) return buffer;
  }

  return smallest;
}

async function optimizeImage(filePath) {
  const before = (await stat(filePath)).size;
  if (before <= TARGET_BYTES) return null;

  const extension = path.extname(filePath).toLowerCase();
  const buffer = extension === ".png"
    ? await compressPng(filePath)
    : await compressJpeg(filePath);

  if (!buffer || buffer.length > TARGET_BYTES) {
    throw new Error(`${path.basename(filePath)} remains ${buffer?.length ?? 0} bytes`);
  }

  await sharp(buffer).metadata();
  const temporaryPath = `${filePath}.optimized`;
  try {
    await writeFile(temporaryPath, buffer);
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }

  return { before, after: buffer.length };
}

const files = (await readdir(MEDIA_DIR))
  .filter((name) => RASTER_EXTENSIONS.has(path.extname(name).toLowerCase()))
  .map((name) => path.join(MEDIA_DIR, name));

let cursor = 0;
let optimizedCount = 0;
let originalBytes = 0;
let optimizedBytes = 0;

async function worker() {
  while (cursor < files.length) {
    const filePath = files[cursor++];
    const result = await optimizeImage(filePath);
    if (!result) continue;
    optimizedCount += 1;
    originalBytes += result.before;
    optimizedBytes += result.after;
    console.log(
      `${path.basename(filePath)}: ${Math.round(result.before / 1024)} KiB -> ${Math.round(result.after / 1024)} KiB`,
    );
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

async function syncContentDimensions() {
  const contentPath = path.resolve("src/content/pages.json");
  const pages = JSON.parse(await readFile(contentPath, "utf8"));
  const dimensions = new Map();

  for (const filePath of files) {
    const metadata = await sharp(filePath).metadata();
    dimensions.set(`/media/${path.basename(filePath)}`, {
      width: metadata.width,
      height: metadata.height,
    });
  }

  for (const page of pages) {
    for (const image of page.images ?? []) {
      const current = dimensions.get(image.localPath);
      if (!current) continue;
      image.width = current.width;
      image.height = current.height;
    }
  }

  const temporaryPath = `${contentPath}.optimized`;
  await writeFile(temporaryPath, `${JSON.stringify(pages, null, 2)}\n`);
  await rename(temporaryPath, contentPath);
}

await syncContentDimensions();

console.log(
  `Optimized ${optimizedCount} images: `
  + `${(originalBytes / 1048576).toFixed(1)} MiB -> ${(optimizedBytes / 1048576).toFixed(1)} MiB`,
);
