import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventory — จัดการสต็อกสินค้า",
  description: "จัดการสินค้า หมวดหมู่ และรายการเคลื่อนไหวในที่เดียว",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
