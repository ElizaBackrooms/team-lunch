import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fraunces } from "next/font/google";
import { MobileNav } from "@/components/mobile-nav";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-loaded",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body-loaded",
});

export const metadata: Metadata = {
  title: "Team Lunch",
  description: "Vote, optionally join, one consolidated DoorDash order.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Team Lunch",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#e4ebe0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <MobileNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
