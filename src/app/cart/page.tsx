import type { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "購物車",
  description: "查看您的購物車商品，確認品項與數量後前往結帳。",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartClient />;
}
