import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "霧抉茶 | 台灣嘉義梅山高山茶";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2C3A32 0%, #3D4A42 60%, #4A5E50 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景裝飾圓 */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "rgba(125,155,132,0.12)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "rgba(163,191,168,0.08)",
            display: "flex",
          }}
        />

        {/* 茶葉 SVG 裝飾 */}
        <div
          style={{
            position: "absolute",
            right: "80px",
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.07,
            display: "flex",
          }}
        >
          <svg width="360" height="360" viewBox="0 0 100 100" fill="none">
            <path
              d="M50 5C50 5 15 28 15 58C15 76 30.5 91 50 91C69.5 91 85 76 85 58C85 28 50 5 50 5Z"
              fill="#A3BFA8"
            />
            <path
              d="M50 20C50 20 30 40 30 58C30 68 39 77 50 77C61 77 70 68 70 58C70 40 50 20 50 20Z"
              fill="#C8DDD0"
            />
          </svg>
        </div>

        {/* 主內容 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0px",
          }}
        >
          {/* 英文副標 */}
          <div
            style={{
              fontSize: "16px",
              letterSpacing: "8px",
              color: "#7D9B84",
              textTransform: "uppercase",
              marginBottom: "16px",
              fontFamily: "serif",
            }}
          >
            Wu Jue Tea
          </div>

          {/* 品牌名稱 */}
          <div
            style={{
              fontSize: "120px",
              fontWeight: "900",
              color: "#C8DDD0",
              letterSpacing: "12px",
              lineHeight: "1",
              fontFamily: "serif",
              marginBottom: "24px",
            }}
          >
            霧抉茶
          </div>

          {/* 分隔線 */}
          <div
            style={{
              width: "60px",
              height: "2px",
              background: "#7D9B84",
              marginBottom: "24px",
              display: "flex",
            }}
          />

          {/* 標語 */}
          <div
            style={{
              fontSize: "26px",
              color: "#A3BFA8",
              letterSpacing: "4px",
              fontFamily: "serif",
            }}
          >
            嘉義梅山・自產自銷高山茶
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
