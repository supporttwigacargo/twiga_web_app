import type { Metadata } from "next";
import { QuoteForm } from "@/components/sections/quote-form";
import { SectionHeader } from "@/components/sections/section-header";
import { VolumeCalculator } from "@/components/sections/volume-calculator";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Air cargo rates, sea cargo rates, volume calculator, and request quote form for Twiga Star Cargo LLC.",
};

export default function PricingPage() {
  return (
    <main className="container-px py-20">
      <SectionHeader title="Cargo Pricing & Quotes" text="Official cargo rates will be published here once confirmed. For now, please request a tailored quotation." />
      <Card className="mx-auto mt-12 max-w-4xl p-8 text-center">
        <h2 className="text-3xl font-black text-brand-primary">Official rates coming soon</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#6e696a]">
          Air cargo, sea cargo, door-to-door delivery, and procurement rates will be added after Twiga Star Cargo confirms the real pricing table.
        </p>
      </Card>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <VolumeCalculator />
        <QuoteForm />
      </div>
    </main>
  );
}
