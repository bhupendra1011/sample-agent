import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "My Agora App",
  description: "Video conferencing with Agora",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={syne.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
