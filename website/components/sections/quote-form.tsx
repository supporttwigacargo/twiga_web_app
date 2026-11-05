"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { copy } from "@/lib/i18n";

export function QuoteForm() {
  const [sent, setSent] = useState(false);
  const labels = copy.en;

  return (
    <Card className="p-6">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder={labels.name} required />
          <Input placeholder={labels.contact} required />
          <Select defaultValue="Air Freight">
            <option>Air Freight</option>
            <option>Sea Freight</option>
            <option>Road Freight</option>
            <option>Procurement</option>
            <option>Door-to-Door Delivery</option>
          </Select>
          <Select defaultValue="AED">
            <option>AED</option>
            <option>TZS</option>
          </Select>
          <Input placeholder="Origin" />
          <Input placeholder="Destination" />
        </div>
        <Textarea rows={4} placeholder={labels.cargoDetails} />
        <Button type="submit">{labels.quote}</Button>
        {sent ? <p className="text-sm font-bold text-green-700">Quote request captured. Connect Supabase to store submissions.</p> : null}
      </form>
    </Card>
  );
}
