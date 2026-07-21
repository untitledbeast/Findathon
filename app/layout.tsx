import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Findathon — Discover & Submit Hackathons Near You",
  description: "Find top online, college, and in-person hackathons. Filter by city, university, AI, and Web3 tags. Submit your own hackathon events easily.",
  keywords: ["hackathon", "hackathon finder", "AI hackathon", "Web3 hackathon", "college hackathon", "Findathon", "coding competition"],
  authors: [{ name: "Findathon Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#0b0f19] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
