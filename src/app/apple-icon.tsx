import { ImageResponse } from "next/og";

// iOS 主畫面圖示。與 opengraph-image.tsx 同樣走 ImageResponse。
// 與 icon.svg 的差別：iOS 會自己套圓角遮罩，所以這裡用**滿版方形底**，
// 不自帶圓角（自帶圓角會被 iOS 再切一次，邊緣出現雙層弧線）。
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3D4A42",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 4.2C16 4.2 4.8 12.6 4.8 20.6C4.8 25.7 9.8 29.8 16 29.8C22.2 29.8 27.2 25.7 27.2 20.6C27.2 12.6 16 4.2 16 4.2Z"
            fill="#C8DDD0"
          />
          <path d="M16 28V12" stroke="#3D4A42" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
