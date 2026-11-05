"use client";

import { navItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Menu, Phone, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { copy } from "@/lib/i18n";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const labels = copy.en;

  return (
    <header className="sticky top-0 z-50 border-b border-[#d4c3b3]/60 bg-[#fcfcfc]/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92">
      <div className="container-px hidden h-10 items-center justify-between bg-brand-primary text-xs font-semibold text-white md:flex">
        <span>Head Office: Dubai, UAE | Branch: Dar es Salaam, Tanzania</span>
        <a className="inline-flex items-center gap-2" href="tel:+971542859771">
          <Phone size={14} /> +971 54 285 9771
        </a>
      </div>
      <div className="container-px flex h-20 items-center justify-between gap-5">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/twiga-star-cargo-logo-transparent.png" alt="Twiga Star Cargo logo" width={132} height={114} className="h-14 w-auto" priority />
          <span className="hidden text-base font-black leading-tight text-brand-primary sm:block">
            Twiga Star
            <br />
            Cargo LLC
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-bold text-[#6e696a] transition hover:bg-brand-taupe/30 hover:text-brand-primary dark:text-slate-200",
                pathname === item.href && "bg-brand-secondary text-white hover:bg-brand-secondary hover:text-white",
              )}
            >
              {labels.nav[navItems.indexOf(item)]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LinkButton href="/contact">{labels.requestQuote}</LinkButton>
        </div>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 lg:hidden dark:border-slate-700"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <div className="container-px border-t border-slate-200 bg-white py-4 lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-bold">
                {labels.nav[navItems.indexOf(item)]}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
