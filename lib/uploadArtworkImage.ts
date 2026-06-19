import { put } from "@vercel/blob";

export async function uploadArtworkImage(imageBase64: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("Blob storage is not configured");
  }

  const base64 = imageBase64.replace(/^data:image\/png;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");

  if (imageBuffer.length === 0) {
    throw new Error("Invalid image data");
  }

  const filename = `artworks/${Date.now()}.png`;
  const blob = await put(filename, imageBuffer, {
    access: "public",
    contentType: "image/png",
    token,
  });

  return blob.url;
}
