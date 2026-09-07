import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { blueskyImageByteLimit, prepareBlueskyImage } from "./prepareBlueskyImage.js";

describe("prepareBlueskyImage", () => {
  it("keeps an image already below Bluesky's limit unchanged", async () => {
    const content = Buffer.from("small-image");
    await expect(prepareBlueskyImage("image/png", content)).resolves.toEqual({
      mimeType: "image/png", content,
    });
  });

  it("reduces a large image below Bluesky's byte limit", async () => {
    const noise = Buffer.alloc(2_200 * 2_200 * 3);
    for (let index = 0; index < noise.length; index += 1) noise[index] = index % 251;
    const source = await sharp(noise, { raw: { width: 2_200, height: 2_200, channels: 3 } })
      .png({ compressionLevel: 0 })
      .toBuffer();
    expect(source.byteLength).toBeGreaterThan(blueskyImageByteLimit);

    const result = await prepareBlueskyImage("image/png", source);

    expect(result.mimeType).toBe("image/jpeg");
    expect(result.content.byteLength).toBeLessThanOrEqual(blueskyImageByteLimit);
  });
});
