import crypto from "crypto";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer-core";
import db from "../db/client";

export type ScreenshotStatus = "pending" | "ready" | "failed" | "skipped";

const DATA_DIR = path.dirname(process.env.DB_PATH ?? path.join(process.cwd(), "thedash.db"));
const PREVIEW_ROOT = process.env.PREVIEW_DIR ?? path.join(DATA_DIR, "previews");
const BOOKMARK_PREVIEW_DIR = path.join(PREVIEW_ROOT, "bookmarks");
const CHROME_EXECUTABLE =
  process.env.CHROME_BIN ??
  process.env.CHROMIUM_PATH ??
  "/usr/bin/chromium-browser";

function getChromeExecutablePath(): string {
  const candidates = [
    CHROME_EXECUTABLE,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ];
  return candidates.find((candidate) => fsSync.existsSync(candidate)) ?? CHROME_EXECUTABLE;
}

export function getPreviewRoot(): string {
  return PREVIEW_ROOT;
}

function screenshotFilename(linkId: number, url: string): string {
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `${linkId}-${hash}.jpg`;
}

function setPreviewStatus(
  linkId: number,
  status: ScreenshotStatus,
  screenshotUrl: string | null = null
): void {
  db.prepare(
    `UPDATE links
     SET screenshot_status = ?,
         screenshot_url = ?,
         screenshot_updated_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(status, screenshotUrl, linkId);
}

export async function captureBookmarkScreenshot(linkId: number, url: string): Promise<void> {
  await fs.mkdir(BOOKMARK_PREVIEW_DIR, { recursive: true });
  const filename = screenshotFilename(linkId, url);
  const outputPath = path.join(BOOKMARK_PREVIEW_DIR, filename);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      executablePath: getChromeExecutablePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.setUserAgent("TheDash/1.0 (+https://github.com/mschoettli/TheDash)");
    page.setDefaultNavigationTimeout(12000);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 12000 });
    await page.screenshot({
      path: outputPath,
      type: "jpeg",
      quality: 78,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });

    setPreviewStatus(linkId, "ready", `/api/previews/bookmarks/${filename}`);
  } catch (error) {
    console.warn(`Bookmark screenshot failed for ${url}:`, error);
    setPreviewStatus(linkId, "failed", null);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export function queueBookmarkScreenshot(linkId: number, url: string): void {
  setPreviewStatus(linkId, "pending", null);
  void captureBookmarkScreenshot(linkId, url);
}
