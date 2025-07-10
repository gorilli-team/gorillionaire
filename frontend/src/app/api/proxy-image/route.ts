import { NextRequest } from "next/server";

const isValidImageUrl = (url: string) =>
  /^https:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url) ||
  /^https:\/\/.+\.(com|net|org|io|co|app|dev|tech|ai|re)\/.+/i.test(url);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl || !isValidImageUrl(imageUrl)) {
    return new Response("Invalid or missing url param", { status: 400 });
  }

  try {
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return new Response("Failed to fetch image", { status: 400 });
    }
    const contentType = imageRes.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      return new Response("Not an image", { status: 400 });
    }
    const body = imageRes.body;
    if (!body) {
      return new Response("No image data", { status: 400 });
    }
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Error fetching image", { status: 400 });
  }
}
