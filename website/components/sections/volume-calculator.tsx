"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";

export function VolumeCalculator() {
  const [length, setLength] = useState(60);
  const [width, setWidth] = useState(40);
  const [height, setHeight] = useState(40);

  const cbm = useMemo(() => ((length * width * height) / 1000000).toFixed(3), [length, width, height]);
  const volumetric = useMemo(() => ((length * width * height) / 6000).toFixed(2), [length, width, height]);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black text-brand-primary">Volume Calculator</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Input type="number" value={length} onChange={(event) => setLength(Number(event.target.value))} aria-label="Length in centimeters" />
        <Input type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} aria-label="Width in centimeters" />
        <Input type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} aria-label="Height in centimeters" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
          <p className="text-sm font-bold text-slate-500">CBM</p>
          <p className="text-3xl font-black text-brand-primary">{cbm}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
          <p className="text-sm font-bold text-slate-500">Air volumetric kg</p>
          <p className="text-3xl font-black text-brand-primary">{volumetric}</p>
        </div>
      </div>
    </Card>
  );
}

