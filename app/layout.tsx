import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);

  return {
    metadataBase: origin,
    title: "عظیم | دستیار تحلیل بنیادی",
    description: "پلتفرم ساده و حرفه‌ای برای تحلیل بنیادی سهام، ارزش‌گذاری و پایش تز سرمایه‌گذاری.",
    openGraph: {
      title: "عظیم | دستیار تحلیل بنیادی",
      description: "تحلیل بنیادی، ارزش‌گذاری و پایش تز سرمایه‌گذاری در یک نمای ساده و حرفه‌ای.",
      images: [{ url: new URL("/og.jpg", origin).toString(), width: 1200, height: 675, alt: "عظیم، دستیار تحلیل بنیادی" }],
      locale: "fa_IR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "عظیم | دستیار تحلیل بنیادی",
      description: "تحلیل بنیادی، ارزش‌گذاری و پایش تز سرمایه‌گذاری.",
      images: [new URL("/og.jpg", origin).toString()],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
