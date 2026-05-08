import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "コレミル — 20秒で今夜の1本が決まる";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #000000 0%, #18181b 60%, #27272a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* ロゴエリア */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: "#dc2626",
            }}
          />
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#dc2626",
              letterSpacing: "0.15em",
            }}
          >
            コレミル
          </span>
        </div>

        {/* メインコピー */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "32px",
          }}
        >
          20秒で今夜の
          <br />
          1本が決まる
        </div>

        {/* サブコピー */}
        <div
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          5回スワイプするだけ。迷わない映画決断マシン。
        </div>

        {/* スワイプアイコン行 */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 28, color: "#f87171" }}>← スキップ</span>
          <span style={{ fontSize: 28, color: "#4ade80" }}>見たい →</span>
          <span style={{ fontSize: 28, color: "#facc15" }}>↑ お気に入り</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
