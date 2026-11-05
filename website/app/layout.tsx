import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { FloatingWhatsApp } from "@/components/layout/floating-whatsapp";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://twigastarcargo.com"),
  title: {
    default: "Twiga Star Cargo LLC | Freight Forwarding & Logistics",
    template: "%s | Twiga Star Cargo LLC",
  },
  description:
    "Premium cargo, freight forwarding, shipping, procurement, and delivery services from Dubai, UAE to Dar es Salaam, Tanzania and beyond.",
  keywords: [
    "Twiga Star Cargo",
    "Dubai cargo",
    "Tanzania cargo",
    "freight forwarding",
    "air freight",
    "sea freight",
    "procurement",
  ],
  openGraph: {
    title: "Twiga Star Cargo LLC",
    description: "Cargo, freight forwarding, shipping, procurement, and delivery services.",
    url: "https://twigastarcargo.com",
    siteName: "Twiga Star Cargo LLC",
    images: ["/twiga-star-cargo-logo-clean.png"],
    locale: "en_AE",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        {children}
        <Footer />
        <FloatingWhatsApp />
      </body>
    </html>
  );
}
