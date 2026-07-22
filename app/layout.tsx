import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AuthModalProvider } from "@/components/AuthModal";
import AuroraBackground from "@/components/AuroraBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-[#060816] text-[#F6F8FC] antialiased selection:bg-[#8B5CF6] selection:text-white">
        <AuthProvider>
          <AuthModalProvider>
            <AuroraBackground />
            <div className="relative z-10 min-h-screen flex flex-col pt-20">
              {children}
            </div>
          </AuthModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
