import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { mediaFilePath, mediaRequestIsValid, newStorageKey, PhotoRejectedError, processPhoto, signedMediaUrl } from "@/lib/media";

const key = Buffer.alloc(32, 3).toString("base64");
const now = new Date("2026-11-28T12:00:00Z");

const parse = (url: string) => {
  const u = new URL(url, "http://x");
  const [, , storageKey, size] = u.pathname.split("/");
  return { key: storageKey!, size: size!, exp: u.searchParams.get("exp"), sig: u.searchParams.get("sig") };
};

describe("signed photo links (NFR-07)", () => {
  it("accepts a fresh link and refuses it after 5 minutes", () => {
    const req = parse(signedMediaUrl(newStorageKey(), "profile", now, key));
    expect(mediaRequestIsValid({ ...req, now }, key)).toBe(true);
    expect(mediaRequestIsValid({ ...req, now: new Date(now.getTime() + 4 * 60_000) }, key)).toBe(true);
    expect(mediaRequestIsValid({ ...req, now: new Date(now.getTime() + 6 * 60_000) }, key)).toBe(false);
  });

  it("refuses tampering: other photo, other size, later expiry, other key", () => {
    const req = parse(signedMediaUrl(newStorageKey(), "list", now, key));
    expect(mediaRequestIsValid({ ...req, key: newStorageKey(), now }, key)).toBe(false);
    expect(mediaRequestIsValid({ ...req, size: "review", now }, key)).toBe(false);
    expect(mediaRequestIsValid({ ...req, exp: String(Number(req.exp) + 60), now }, key)).toBe(false);
    expect(mediaRequestIsValid({ ...req, now }, Buffer.alloc(32, 4).toString("base64"))).toBe(false);
    expect(mediaRequestIsValid({ ...req, sig: null, now }, key)).toBe(false);
  });

  it("never builds a path outside the media folder", () => {
    expect(() => mediaFilePath("../../etc/passwd", "list", "/srv/media")).toThrow();
    expect(() => mediaFilePath("ABCDEF", "list", "/srv/media")).toThrow();
    expect(mediaFilePath("0123456789abcdef0123456789abcdef", "list", "/srv/media")).toBe("/srv/media/0123456789abcdef0123456789abcdef/list.webp");
  });
});

describe("photo processing (PRO-04, NFR-02)", () => {
  const photo = (w: number, h: number) =>
    sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 120, b: 150 } } })
      .jpeg()
      .withExif({ IFD0: { Make: "TestCam", Model: "Location Phone", Copyright: "Monrovia 6.30N 10.80W" } })
      .toBuffer();

  it("makes three WebP sizes with every piece of metadata removed", async () => {
    const input = await photo(1600, 2000);
    expect((await sharp(input).metadata()).exif).toBeDefined(); // the test photo really has EXIF
    const out = await processPhoto(input);
    for (const [size, buf] of Object.entries(out)) {
      const meta = await sharp(buf).metadata();
      expect(meta.format, size).toBe("webp");
      expect(meta.exif, size).toBeUndefined();
      expect(meta.xmp, size).toBeUndefined();
    }
    const list = await sharp(out.list).metadata();
    expect([list.width, list.height]).toEqual([360, 450]);
    const profile = await sharp(out.profile).metadata();
    expect(profile.width).toBeLessThanOrEqual(720);
  });

  it("rejects files that aren't usable photos", async () => {
    await expect(processPhoto(Buffer.from("not an image at all"))).rejects.toBeInstanceOf(PhotoRejectedError);
    await expect(processPhoto(await photo(200, 200))).rejects.toMatchObject({ code: "too-small" });
    const gif = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ccc" } }).gif().toBuffer();
    await expect(processPhoto(gif)).rejects.toMatchObject({ code: "wrong-format" });
  });
});
