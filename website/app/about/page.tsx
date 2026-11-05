import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/sections/section-header";
import { Reveal } from "@/components/sections/reveal";
import { timeline } from "@/lib/data";
import { Eye, Gem, Handshake, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Twiga Star Cargo LLC, our mission, vision, values, and trusted Dubai to Tanzania logistics operations.",
};

const values = [
  { title: "Reliability", text: "We keep cargo movement organized and visible.", icon: Handshake },
  { title: "Transparency", text: "Clear shipment status, documentation, and pricing.", icon: Eye },
  { title: "Trade Confidence", text: "Procurement support that reduces supplier and quality risk.", icon: Gem },
  { title: "Speed", text: "Route planning that respects business deadlines.", icon: Target },
];

export default function AboutPage() {
  return (
    <main>
      <section className="container-px bg-white py-20 dark:bg-slate-950">
        <Reveal>
          <SectionHeader
            title="A Dubai Logistics Partner With East Africa Reach"
            text="Twiga Star Cargo LLC supports customers moving products, parcels, commercial stock, and procurement orders through professional logistics coordination."
          />
        </Reveal>
      </section>

      <section className="container-px grid gap-5 py-16 md:grid-cols-2">
        <Card className="p-8">
          <h2 className="text-3xl font-black text-brand-primary">Mission</h2>
          <p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">
            To make cargo movement between UAE, Tanzania, and global markets simple, transparent, and dependable for every customer.
          </p>
        </Card>
        <Card className="p-8">
          <h2 className="text-3xl font-black text-brand-primary">Vision</h2>
          <p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">
            To become a trusted international logistics brand known for speed, professionalism, and trade support.
          </p>
        </Card>
      </section>

      <section className="container-px py-16">
        <SectionHeader title="Core Values" />
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <Card className="p-6" key={value.title}>
                <Icon className="mb-4 text-brand-secondary" size={32} />
                <h3 className="text-xl font-black">{value.title}</h3>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{value.text}</p>
              </Card>
            );
          })}
        </div>
      </section>    

      <section className="container-px grid gap-10 bg-brand-primary py-20 text-white lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-4xl font-black">Company Timeline</h2>
          <p className="mt-4 leading-8 text-white/75">A growth path built around cargo customers and trade routes.</p>
        </div>
        <div className="grid gap-4">
          {timeline.map((item, index) => (
            <div className="flex gap-4" key={item}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-secondary font-black text-brand-accent">{index + 1}</span>
              <p className="pt-2 text-lg font-bold">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-px py-20">
        <SectionHeader title="Why Customers Trust Twiga Star Cargo" text="A people-first team, structured operations, and a practical understanding of importers, exporters, and ecommerce sellers." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {["Dubai head office", "Dar es Salaam branch", "Responsive support team"].map((item) => (
            <Card className="p-8 text-center" key={item}>
              <h3 className="text-2xl font-black text-brand-primary">{item}</h3>
              <p className="mt-3 text-slate-600 dark:text-slate-300">Professional cargo coordination and customer communication.</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

