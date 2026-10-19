import { ImageResponse } from "next/og";

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
): Promise<Response> {
  const { size: requestedSize } = await context.params;
  if (requestedSize !== "192" && requestedSize !== "512") {
    return new Response("Unsupported icon size", { status: 404 });
  }
  const size = Number(requestedSize);
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#07111b", color: "#66e4ce",
      fontSize: size * 0.55, fontWeight: 700,
    }}>S</div>,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}