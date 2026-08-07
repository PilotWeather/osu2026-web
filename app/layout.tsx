import type { Metadata } from "next";
import { ThemeProvider } from "@/src/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ÖSU 2026 | Uçuş Öğretmenleri",
  description: "ÖSU 2026 personel, ekip ve lisans geçerlilik takibi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme storageKey="osu2026-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
