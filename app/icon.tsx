import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #5b21b6 100%)",
          borderRadius: "108px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0px",
          }}
        >
          <span style={{ fontSize: "220px", lineHeight: 1 }}>📸</span>
          <span
            style={{
              fontSize: "56px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
              marginTop: "-20px",
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
