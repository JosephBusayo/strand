// Builds the sample client screenshots in public/samples from photo 3 of each style.
// Run: npx tsx scripts/make-samples.ts
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const caption = (text: string, width: number) =>
  Buffer.from(
    `<svg width="${width}" height="84"><rect width="${width}" height="84" fill="#251f19" opacity="0.72"/><text x="28" y="54" font-family="Arial" font-size="32" fill="white">${text}</text></svg>`,
  );

const SAMPLES = [
  { from: "knotless-braids", to: "braids", text: "how much for this?" },
  { from: "fade", to: "fade", text: "can you do this cut?" },
  { from: "locs", to: "locs", text: "want my hair like this" },
  { from: "cornrows-men", to: "cornrows", text: "price for these?" },
];

async function main() {
  mkdirSync("public/samples", { recursive: true });
  for (const sample of SAMPLES) {
    await sharp(`demo-assets/screenshots/${sample.from}.jpg`)
      .rotate()
      .resize(800, 1000, { fit: "cover", position: "attention" })
      .composite([{ input: caption(sample.text, 800), gravity: "south" }])
      .jpeg({ quality: 80 })
      .toFile(`public/samples/${sample.to}.jpg`);
    console.log(`public/samples/${sample.to}.jpg`);
  }
}

main();
