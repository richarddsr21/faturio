import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Faturio — Precificação, estoque e vendas em um só lugar";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#FAFAFC",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 88,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#10B981",
            marginBottom: 40,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            color: "#6366F1",
            letterSpacing: "-0.02em",
          }}
        >
          Faturio
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 36,
            color: "#1E1B4B",
            maxWidth: 900,
          }}
        >
          Precificação, estoque e vendas em um só lugar
        </div>
      </div>
    ),
    { ...size }
  );
}
