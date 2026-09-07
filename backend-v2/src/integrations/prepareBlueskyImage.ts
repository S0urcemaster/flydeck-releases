import sharp from "sharp";
import { HttpError } from "../http/HttpError.js";

export const blueskyImageByteLimit = 2_000_000;

export async function prepareBlueskyImage(mimeType: string, content: Buffer) {
  if (content.byteLength <= blueskyImageByteLimit) return { mimeType, content };

  const attempts = [
    { size: 2_000, quality: 85 },
    { size: 1_600, quality: 78 },
    { size: 1_280, quality: 70 },
  ];
  for (const { size, quality } of attempts) {
    const prepared = await sharp(content)
      .rotate()
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (prepared.byteLength <= blueskyImageByteLimit) {
      return { mimeType: "image/jpeg", content: prepared };
    }
  }
  throw new HttpError(413, "INVALID_REQUEST", "Image could not be reduced below Bluesky's 2 MB limit");
}
