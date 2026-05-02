import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07111b",
          color: "#4fdcff",
          fontSize: 92,
          fontWeight: 700,
          borderRadius: 36,
          border: "4px solid rgba(79,220,255,0.35)",
        }}
      >
        S
      </div>
    ),
    size
  );
}
