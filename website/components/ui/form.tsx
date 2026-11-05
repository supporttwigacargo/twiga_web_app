import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-950",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-950",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-950",
        props.className,
      )}
    />
  );
}

