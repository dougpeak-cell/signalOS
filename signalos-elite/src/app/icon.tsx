import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 18,
          fontWeight: 700,
          borderRadius: 8,
          border: "1px solid rgba(79,220,255,0.35)",
        }}
      >
        S
      </div>
    ),
    size
  );
}
