import { navItems } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { Instagram, Mail, MapPin, Music2, Phone } from "lucide-react";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/twigastarcargo?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    icon: Instagram,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@twigastar_cargo?_r=1&_t=ZS-97C7xAJm9si",
    icon: Music2,
  },
];

export function Footer() {
  return (
    <footer className="bg-brand-accent text-white">
      <div className="container-px grid gap-10 py-14 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <Image src="/twiga-star-cargo-logo-transparent.png" alt="Twiga Star Cargo" width={150} height={128} className="mb-5 h-20 w-auto rounded bg-white p-2" />
          <p className="max-w-md text-sm leading-7 text-slate-300">
            Premium cargo, freight forwarding, procurement, and delivery services connecting Dubai, Tanzania, and international trade routes.
          </p>
          <div className="mt-5 flex gap-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 text-slate-200 transition hover:border-brand-secondary hover:text-brand-secondary"
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-black">Navigation</h3>
          <div className="grid gap-2">
            {navItems.map((item) => (
              <Link className="text-sm text-slate-300 hover:text-brand-secondary" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="text-sm font-bold text-brand-taupe hover:text-brand-secondary" href="/portal">
              Twiga Portal
            </Link>
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-black">Contact</h3>
          <div className="grid gap-3 text-sm text-slate-300">
            <span className="flex gap-2"><MapPin size={17} /> Avon Building, Sabkha Road, Deira, Dubai, UAE</span>
            <span className="flex gap-2"><MapPin size={17} /> Mwinyijuma RD House No 15, Mwananyamala, Kinondoni, Dar es Salaam</span>
            <a className="flex gap-2 hover:text-brand-secondary" href="tel:+971542859771"><Phone size={17} /> +971 54 285 9771</a>
            <a className="flex gap-2 hover:text-brand-secondary" href="tel:+255764262132"><Phone size={17} /> +255 764 262 132</a>
            <a className="flex gap-2 hover:text-brand-secondary" href="mailto:info@twigastarcargo.com"><Mail size={17} /> info@twigastarcargo.com</a>
          </div>
        </div>
      </div>
      <div className="container-px border-t border-white/10 py-5 text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Twiga Star Cargo LLC. All rights reserved.
      </div>
    </footer>
  );
}
