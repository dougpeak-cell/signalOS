import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const EXT_ORDER = [".png", ".svg", ".webp", ".jpg", ".jpeg"];

function contentTypeFor(ext: string) {
  switch (ext) {
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "image/png";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  const baseDir = path.join(process.cwd(), "public", "team-logos");

  for (const ext of EXT_ORDER) {
    const filePath = path.join(baseDir, `${slug}${ext}`);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": contentTypeFor(ext),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  // fallback
  const fallback = path.join(baseDir, "default.png");
  const buf = fs.readFileSync(fallback);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-cache",
    },
  });
}
