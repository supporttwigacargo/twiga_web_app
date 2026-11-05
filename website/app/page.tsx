import type { Metadata } from "next";
import { HomeContent, HomeHero } from "@/components/sections/home-sections";

export const metadata: Metadata = {
  title: "Home",
  description: "Twiga Star Cargo LLC cargo, freight forwarding, procurement, and delivery services from Dubai to Tanzania and global routes.",
};

export default function HomePage() {
  return (
    <main>
      <HomeHero />
      <HomeContent />
    </main>
  );
}

