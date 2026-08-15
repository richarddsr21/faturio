import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          backgroundColor: "#0E7C5D",
          borderRadius: 7,
          padding: "0 0 6px 0",
        }}
      >
        <div style={{ display: "flex", width: 5, height: 9, backgroundColor: "#A7E3CB", borderRadius: 1 }} />
        <div style={{ display: "flex", width: 5, height: 15, backgroundColor: "#DFF5EA", borderRadius: 1 }} />
        <div style={{ display: "flex", width: 5, height: 21, backgroundColor: "#FFFFFF", borderRadius: 1 }} />
      </div>
    ),
    { ...size }
  );
}
