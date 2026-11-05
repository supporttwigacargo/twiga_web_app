import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  text,
  className,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-3xl text-center", className)}>
      {eyebrow ? <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-brand-secondary">{eyebrow}</p> : null}
      <h2 className="text-3xl font-black tracking-tight text-brand-accent dark:text-white md:text-5xl">{title}</h2>
      {text ? <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">{text}</p> : null}
    </div>
  );
}
