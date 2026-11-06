import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class ImageRejected extends Error {}

// Re-encoding proves it's a real image and strips embedded metadata such as location.
export async function storeImage(file: File, folder: "uploads" | "catalogue") {
  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
    throw new ImageRejected("Use a JPEG, PNG or WebP image under 5 MB.");
  }
  const image = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
    .catch(() => {
      throw new ImageRejected("That image could not be read.");
    });

  const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  );
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "acag";
  const path = `${folder}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, image, { contentType: "image/jpeg" });
  if (error) throw new Error("Upload failed. Try again.");
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
