import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Clause — Verifiable Legal Contract Analysis";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#08090a",
          padding: "80px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            width: "600px",
            height: "300px",
            borderRadius: "50%",
            backgroundColor: "rgba(94, 106, 210, 0.2)",
            filter: "blur(90px)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 20px",
            borderRadius: "9999px",
            backgroundColor: "#0f1011",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#4cb782",
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#4cb782",
            }}
          />
          <span>100% Cryptographically Verified Quotes</span>
        </div>

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#0f1011" />
            <path
              d="M7 8.5C7 7.67157 7.67157 7 8.5 7H11V11H8.5C7.67157 11 7 10.3284 7 9.5V8.5Z"
              fill="#5e6ad2"
            />
            <path
              d="M13 8.5C13 7.67157 13.6716 7 14.5 7H17V11H14.5C13.6716 11 13 10.3284 13 9.5V8.5Z"
              fill="#f7f8f8"
            />
            <circle cx="17.5" cy="6.5" r="1.5" fill="#4cb782" />
          </svg>
          <span
            style={{
              fontSize: "42px",
              fontWeight: "bold",
              color: "#f7f8f8",
              letterSpacing: "-0.04em",
            }}
          >
            Clause
          </span>
        </div>

        {/* Main Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
            maxWidth: "960px",
          }}
        >
          Contract answers you can check,{" "}
          <span style={{ color: "#5e6ad2" }}>word for word.</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "#8a8f98",
            textAlign: "center",
            marginTop: "24px",
            maxWidth: "760px",
            lineHeight: 1.4,
          }}
        >
          Interrogate covenants and liabilities with zero hallucinations. Every answer
          anchored to exact document offsets.
        </div>
      </div>
    )
  );
}
