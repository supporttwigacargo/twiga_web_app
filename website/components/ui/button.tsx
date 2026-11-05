import { cn } from "@/lib/utils";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

const styles = {
  primary: "bg-brand-secondary text-white shadow-lg shadow-brand-secondary/25 hover:bg-[#a9382d]",
  secondary: "bg-white text-brand-primary ring-1 ring-[#d4c3b3] hover:bg-brand-taupe/20 dark:bg-slate-900 dark:ring-slate-700",
  ghost: "text-brand-primary hover:bg-brand-primary/10 dark:text-white",
};

const base =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2";

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={cn(base, styles[variant], className)} {...props} />;
}

export function LinkButton({ className, variant = "primary", href, ...props }: LinkButtonProps) {
  return <Link href={href} className={cn(base, styles[variant], className)} {...props} />;
}
