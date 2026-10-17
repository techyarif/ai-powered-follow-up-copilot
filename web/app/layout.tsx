import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Real Estate Follow Up Co-Pilot",
  description:
    "Turn real estate conversations into thoughtful follow-ups, reminders, and WhatsApp drafts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
