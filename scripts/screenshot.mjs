import { chromium } from "playwright";
import fs from "node:fs";

const url = process.argv[2];
const outPath = process.argv[3];
const colorScheme = process.argv[4] === "dark" ? "dark" : "light";
const width = Number(process.argv[5]) || 1280;

if (!url || !outPath) {
  console.error(
    "Uso: node scripts/screenshot.mjs <url> <arquivo-saida.png> [light|dark] [largura-px]"
  );
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme, viewport: { width, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
fs.mkdirSync("screenshots", { recursive: true });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(`Screenshot salvo em ${outPath}`);
