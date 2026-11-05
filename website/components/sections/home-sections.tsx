"use client";

import { features, news, services, stats, testimonials } from "@/lib/data";
import { ArrowRight, CheckCircle2, PackageCheck, Plane, Route, Ship, TimerReset, Warehouse } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "./section-header";
import { QuoteForm } from "./quote-form";
import { Reveal } from "./reveal";
import { TrackingLookup } from "./tracking-lookup";
import { copy } from "@/lib/i18n";

export function HomeHero() {
  const labels = copy.en;

  return (
    <section className="container-px overflow-hidden bg-brand-background py-10 md:py-14">
      <div className="grid min-h-[calc(100vh-11rem)] items-center gap-10 lg:grid-cols-[0.94fr_1.06fr]">
        <Reveal>
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-brand-taupe bg-white px-4 py-2 text-sm font-black text-brand-accent shadow-sm">
              Reliable freight, procurement, and delivery
            </p>
            <h1 className="text-[3.25rem] font-black leading-[0.94] tracking-tight text-brand-primary md:text-7xl">
              Moving cargo with scale, speed, and certainty.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6e696a]">
              {labels.heroText}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/pricing">{labels.rates}</LinkButton>
              <LinkButton href="/tracking" variant="secondary">{labels.trackShipment}</LinkButton>
            </div>
            <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["UAE - TZ", "Core route"],
                ["Air + Sea", "Freight modes"],
                ["Procurement", "Supplier support"],
              ].map(([value, label]) => (
                <div className="rounded-2xl border border-brand-taupe/70 bg-white p-4 shadow-sm" key={value}>
                  <p className="text-xl font-black text-brand-accent">{value}</p>
                  <p className="mt-1 text-sm font-semibold text-[#6e696a]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="relative">
            <div className="absolute -right-8 -top-8 hidden h-44 w-44 rounded-full bg-brand-taupe/55 lg:block" />
            <div className="relative overflow-hidden rounded-[34px] bg-brand-accent shadow-premium">
              <Image
                src="https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=1300&q=85"
                alt="Cargo container port logistics"
                width={1040}
                height={860}
                priority
                className="aspect-[1.05/1] w-full object-cover opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/80 via-brand-primary/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 grid gap-3 rounded-2xl bg-white/95 p-4 shadow-2xl backdrop-blur md:grid-cols-3">
                {[
                  { icon: Route, label: "Route", value: "Dubai - Dar" },
                  { icon: TimerReset, label: "ETA", value: "3-7 days" },
                  { icon: PackageCheck, label: "Status", value: "Tracked" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="flex items-center gap-3" key={item.label}>
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-taupe text-brand-accent">
                        <Icon size={19} />
                      </span>
                      <span>
                        <span className="block text-xs font-black uppercase tracking-wider text-[#999594]">{item.label}</span>
                        <span className="block font-black text-brand-primary">{item.value}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute -left-4 top-8 hidden w-[min(520px,70%)] lg:block">
              <TrackingLookup compact />
            </div>
            <div className="absolute -right-3 top-24 hidden rounded-2xl bg-white p-5 shadow-premium lg:block">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-secondary text-white">
                  <Plane size={22} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#6e696a]">Next dispatch</p>
                  <p className="text-xl font-black text-brand-primary">Air Cargo</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="mt-8 grid gap-4 rounded-[28px] border border-brand-taupe/60 bg-white p-4 shadow-sm md:grid-cols-3">
        {stats.map((stat) => (
          <div className="rounded-2xl bg-[#fcfcfc] p-5 text-center" key={stat.label}>
            <p className="text-3xl font-black text-brand-accent">{stat.value}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#6e696a]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeContent() {
  const preview = services.flatMap((group) => group.items).slice(0, 6);

  return (
    <>
      <section className="container-px bg-white py-20">
        <Reveal>
          <SectionHeader
            title="Cargo Services Designed for Modern Trade"
            text="A professional logistics partner for individuals, retailers, wholesalers, and companies moving goods between UAE, Tanzania, and global markets."
          />
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal delay={index * 0.05} key={feature.title}>
                <Card className="h-full border-brand-taupe/60 p-6 transition hover:-translate-y-1 hover:shadow-premium">
                  <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-taupe/70 text-brand-accent">
                    <Icon size={28} />
                  </span>
                  <h3 className="text-xl font-black text-brand-accent dark:text-white">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-[#6e696a] dark:text-slate-300">{feature.text}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="bg-[#f7f2ee] py-20 dark:bg-slate-950">
        <div className="container-px grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <Image
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1100&q=85"
                alt="Warehouse cargo and logistics"
                width={900}
                height={640}
                className="aspect-[4/3] rounded-[30px] object-cover shadow-premium"
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-brand-secondary">Why choose us</p>
              <h2 className="text-4xl font-black tracking-tight text-brand-accent dark:text-white md:text-5xl">
                Built around transparency, speed, and trade confidence.
              </h2>
              <div className="mt-6 grid gap-4">
                {["Dubai and Dar es Salaam operations", "Air, sea, road, and door-to-door options", "Procurement and supplier support", "Shipment tracking and portal-ready workflows"].map((item) => (
                  <p className="flex gap-3 text-lg font-bold text-brand-primary dark:text-slate-200" key={item}>
                    <CheckCircle2 className="mt-1 shrink-0 text-brand-secondary" /> {item}
                  </p>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-px bg-white py-20">
        <Reveal>
          <SectionHeader title="Services Preview" text="Apex-style service discovery, rebuilt with Twiga Star Cargo branding and broader logistics capabilities." />
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {preview.map((service, index) => {
            const Icon = service.icon;
            return (
              <Reveal delay={index * 0.04} key={service.title}>
                <Card className="group h-full overflow-hidden border-brand-taupe/60 p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-primary text-white">
                      <Icon size={26} />
                    </span>
                    <ArrowRight className="text-brand-secondary transition group-hover:translate-x-1" />
                  </div>
                  <h3 className="text-xl font-black">{service.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{service.text}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="container-px bg-brand-primary py-16 text-white">
        <div className="grid items-center gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-4xl font-black md:text-5xl">One cargo partner for every route.</h2>
            <p className="mt-4 max-w-xl text-white/75">Move fast parcels by air, consolidate by sea, or coordinate procurement and supplier checks before shipping.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Plane, label: "Air freight" },
              { icon: Ship, label: "Sea freight" },
              { icon: Warehouse, label: "Warehousing" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-2xl bg-white/10 p-5" key={item.label}>
                  <Icon className="text-brand-secondary" />
                  <p className="mt-4 font-black">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-px py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <SectionHeader className="mx-0 text-left" title="What Customers Say" text="Professional service for traders, businesses, and personal cargo customers." />
            <div className="mt-8 grid gap-5">
              {testimonials.map((item) => (
                <Card className="p-6" key={item.name}>
                  <p className="text-lg leading-8 text-slate-700 dark:text-slate-200">"{item.quote}"</p>
                  <p className="mt-4 font-black text-brand-primary dark:text-white">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.role}</p>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <SectionHeader className="mx-0 text-left" title="Latest News" text="Helpful cargo, sourcing, and logistics updates." />
            <div className="mt-8 grid gap-5">
              {news.map((item) => (
                <Card className="p-6" key={item.title}>
                  <p className="text-sm font-black uppercase tracking-wider text-brand-secondary">{item.date}</p>
                  <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">{item.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-px pb-20">
        <div className="grid gap-10 rounded-lg bg-brand-accent p-8 text-white md:p-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-4xl font-black">Request a cargo quote today.</h2>
            <p className="mt-4 leading-8 text-slate-300">Send shipment details and the Twiga Star Cargo team will prepare a practical freight option in AED or TZS.</p>
          </div>
          <QuoteForm />
        </div>
      </section>
    </>
  );
}
