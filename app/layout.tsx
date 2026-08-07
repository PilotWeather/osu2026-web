import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ÖSU 2026 | Uçuş Öğretmenleri",
  description: "ÖSU 2026 personel, ekip ve lisans geçerlilik takibi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
