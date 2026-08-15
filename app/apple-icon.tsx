import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 18,
          backgroundColor: "#0E7C5D",
          padding: "0 0 40px 0",
        }}
      >
        <div style={{ display: "flex", width: 28, height: 50, backgroundColor: "#A7E3CB", borderRadius: 6 }} />
        <div style={{ display: "flex", width: 28, height: 85, backgroundColor: "#DFF5EA", borderRadius: 6 }} />
        <div style={{ display: "flex", width: 28, height: 120, backgroundColor: "#FFFFFF", borderRadius: 6 }} />
      </div>
    ),
    { ...size }
  );
}
