import type { Metadata } from "next";
import { SectionHeader } from "@/components/sections/section-header";
import { Card } from "@/components/ui/card";
import { services } from "@/lib/data";

export const metadata: Metadata = {
  title: "Services",
  description: "Cargo, air freight, sea freight, road freight, procurement, warehousing, customs clearance, and ecommerce logistics services.",
};

export default function ServicesPage() {
  return (
    <main className="container-px py-20">
      <SectionHeader
        title="Complete Cargo, Procurement, and Delivery Services"
        text="A full-service logistics structure for personal cargo, business shipments, supplier purchases, and ecommerce delivery."
      />
      <div className="mt-14 grid gap-12">
        {services.map((group) => (
          <section key={group.group}>
            <h2 className="mb-5 text-2xl font-black text-brand-primary">{group.group}</h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {group.items.map((service) => {
                const Icon = service.icon;
                return (
                  <Card className="h-full p-6 transition hover:-translate-y-1 hover:shadow-premium" key={service.title}>
                    <Icon className="mb-5 text-brand-secondary" size={34} />
                    <h3 className="text-xl font-black">{service.title}</h3>
                    <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{service.text}</p>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

