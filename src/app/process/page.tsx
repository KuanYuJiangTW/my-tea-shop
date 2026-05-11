import type { Metadata } from "next";
import ProcessContent from "./ProcessContent";

export const metadata: Metadata = {
  title: "製茶過程",
  description: "從採摘、萎凋、揉捻到焙火，霧抉茶每一道工序都由職人親手把關。了解嘉義阿里山梅山高山茶的完整製茶工藝與40年傳承技術。",
  keywords: ["製茶過程", "台灣製茶工藝", "高山茶製作", "焙火烘焙", "嘉義茶葉"],
  alternates: {
    canonical: "/process",
  },
  openGraph: {
    title: "製茶過程 | 霧抉茶職人工藝",
    description: "從採摘、萎凋、揉捻到焙火，每一道工序都由職人親手把關。了解霧抉茶40年傳承的製茶工藝。",
    url: "/process",
  },
};

export default function ProcessPage() {
  return <ProcessContent />;
}
