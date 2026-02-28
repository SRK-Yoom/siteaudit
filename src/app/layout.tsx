import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SiteScore — Free SEO & GEO Readiness Audit",
  description:
    "Get your free website audit score in 30 seconds. We analyse performance, SEO, GEO readiness, accessibility, and best practices — then tell you exactly what to fix.",
  keywords: [
    "website audit",
    "SEO score",
    "GEO readiness",
    "page speed",
    "site analysis",
    "free SEO audit",
  ],
  openGraph: {
    title: "SiteScore — Free SEO & GEO Readiness Audit",
    description:
      "Instant website audit score. See how your site performs across SEO, speed, AI visibility, and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SiteScore — Free SEO & GEO Readiness Audit",
    description: "Get your free website audit score in 30 seconds.",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
