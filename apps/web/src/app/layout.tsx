import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streamora",
  description: "Creator-verified video platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
