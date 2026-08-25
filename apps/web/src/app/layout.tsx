import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { brand, logoAssets } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: logoAssets.mark.src,
    apple: logoAssets.mark.src,
  },
  applicationName: brand.name,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}