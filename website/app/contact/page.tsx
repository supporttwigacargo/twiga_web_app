import type { Metadata } from "next";
import { SectionHeader } from "@/components/sections/section-header";
import { QuoteForm } from "@/components/sections/quote-form";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { whatsappLink } from "@/lib/utils";
import { Instagram, Mail, MapPin, MessageCircle, Music2, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Twiga Star Cargo LLC Dubai office and Dar es Salaam branch for cargo, procurement, and delivery services.",
};

export default function ContactPage() {
  return (
    <main className="container-px py-20">
      <SectionHeader title="Keep in Touch With Twiga Star Cargo" text="Send shipment details, request rates, or contact our Dubai and Tanzania offices directly." />
      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <QuoteForm />
        <div className="grid gap-5">
          <Office title="Dubai Office" address="Avon Building, Sabkha Road, Deira, Dubai, UAE" phone="+971 54 285 9771" />
          <Office title="Tanzania Office" address="Mwinyijuma RD House No 15, Mwananyamala, Kinondoni, Dar es Salaam" phone="+255 764 262 132" />
          <div className="flex flex-wrap gap-3">
            <LinkButton href={whatsappLink("Hello Twiga Star Cargo, I need cargo support.")} target="_blank" rel="noreferrer" className="gap-2">
              <MessageCircle size={18} /> WhatsApp
            </LinkButton>
            <LinkButton href="tel:+971542859771" variant="secondary" className="gap-2">
              <Phone size={18} /> Call
            </LinkButton>
            <LinkButton href="mailto:info@twigastarcargo.com" variant="secondary" className="gap-2">
              <Mail size={18} /> Email
            </LinkButton>
            <LinkButton
              href="https://www.instagram.com/twigastarcargo?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="gap-2"
            >
              <Instagram size={18} /> Instagram
            </LinkButton>
            <LinkButton
              href="https://www.tiktok.com/@twigastar_cargo?_r=1&_t=ZS-97C7xAJm9si"
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="gap-2"
            >
              <Music2 size={18} /> TikTok
            </LinkButton>
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <iframe
          title="Dubai map"
          className="map-frame h-80 w-full rounded-lg border-0"
          loading="lazy"
          src="https://www.google.com/maps?q=Avon%20Building%20Sabkha%20Road%20Deira%20Dubai%20UAE&output=embed"
        />
        <iframe
          title="Dar es Salaam map"
          className="map-frame h-80 w-full rounded-lg border-0"
          loading="lazy"
          src="https://www.google.com/maps?q=Mwinyijuma%20Road%20House%20No%2015%20Mwananyamala%20Kinondoni%20Dar%20es%20Salaam&output=embed"
        />
      </div>
    </main>
  );
}

function Office({ title, address, phone }: { title: string; address: string; phone: string }) {
  const phoneHref = phone.replace(/\s+/g, "");

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-brand-primary">{title}</h2>
      <p className="mt-3 flex gap-2 text-slate-600 dark:text-slate-300"><MapPin className="shrink-0 text-brand-secondary" /> {address}</p>
      <a className="mt-2 flex gap-2 text-slate-600 transition hover:text-brand-secondary dark:text-slate-300" href={`tel:${phoneHref}`}><Phone className="shrink-0 text-brand-secondary" /> {phone}</a>
    </Card>
  );
}
