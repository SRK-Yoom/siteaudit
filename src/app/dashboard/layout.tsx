import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — SiteScore",
  description: "Track your website SEO, GEO & AEO score over time.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
