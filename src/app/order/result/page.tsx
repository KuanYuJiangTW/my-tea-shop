import type { Metadata } from "next";
import ResultClient from "./ResultClient";

export const metadata: Metadata = {
  title: "訂單結果",
  description: "霧抉茶訂單付款結果頁面。",
  robots: { index: false, follow: false },
};

export default function OrderResultPage() {
  return <ResultClient />;
}
