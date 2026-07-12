import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "České chlevy a márnice",
  description: "Guildovní tracker achievementů",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
