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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #5b21b6 100%)",
          borderRadius: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "80px", lineHeight: 1 }}>📸</span>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1px",
              marginTop: "-6px",
            }}
          >
            SNAP
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
