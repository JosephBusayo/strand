// Builds the sample buyer screenshots in public/samples. Run: npx tsx scripts/make-samples.ts
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const asset = (file: string) => readFileSync(`demo-assets/${file}`);
const caption = (text: string, width: number) =>
  Buffer.from(
    `<svg width="${width}" height="84"><rect width="${width}" height="84" fill="#251f19" opacity="0.72"/><text x="28" y="54" font-family="Arial" font-size="32" fill="white">${text}</text></svg>`,
  );

async function main() {
  mkdirSync("public/samples", { recursive: true });

  await sharp(asset("court-low.jpg"))
    .resize(900, 900, { fit: "cover" })
    .flop()
    .modulate({ brightness: 0.92, saturation: 1.15 })
    .composite([{ input: caption("how much is this?", 900), gravity: "south" }])
    .jpeg({ quality: 82 })
    .toFile("public/samples/clear-match.jpg");

  const left = await sharp(asset("court-low.jpg")).resize(600, 600).jpeg().toBuffer();
  const right = await sharp(asset("cloud-runner.jpg")).resize(600, 600).jpeg().toBuffer();
  await sharp({ create: { width: 1200, height: 600, channels: 3, background: "white" } })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: 600, top: 0 },
      { input: caption("which of these do you stock?", 1200), gravity: "south" },
    ])
    .jpeg({ quality: 82 })
    .toFile("public/samples/ambiguous.jpg");
}

main();
