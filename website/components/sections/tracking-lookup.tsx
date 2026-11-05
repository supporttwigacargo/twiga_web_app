"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { supabase } from "@/lib/supabase";

type TrackingResult = {
  shipmentNumber: string;
  status: string;
  statusLabel?: string;
  isOnHold?: boolean;
  origin?: string;
  destination?: string;
  currentLocation?: string;
  lastUpdate?: string;
  history?: { status: string; label?: string; location?: string; time: string; description?: string }[];
};

function dateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function TrackingLookup({ compact = false }: { compact?: boolean; showSampleResult?: boolean }) {
  const [tracking, setTracking] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  async function lookup() {
    const number = tracking.trim().toUpperCase();
    if (!number) return;
    const id = ++requestId.current;
    setResult(null);
    setMessage("");
    if (!supabase) {
      setMessage("Tracking is temporarily unavailable. Please contact Twiga Star Cargo.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("track_shipment", { p_tracking_number: number });
      if (id !== requestId.current) return;
      if (error) throw error;
      if (!data) {
        setMessage("Shipment not found. Check the shipment number on your receipt and try again.");
      } else if (typeof data.shipmentNumber === "string" && typeof data.status === "string") {
        setResult(data as TrackingResult);
      } else {
        throw new Error("Unexpected tracking response");
      }
    } catch {
      if (id === requestId.current) setMessage("Unable to load tracking. Please try again or contact Twiga Star Cargo.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  return (
    <Card className="bg-white/95 p-5 shadow-premium backdrop-blur dark:bg-slate-900/95">
      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={event => { event.preventDefault(); void lookup(); }}>
        <Input value={tracking} onChange={event => {
          requestId.current++;
          setTracking(event.target.value);
          setResult(null);
          setMessage("");
          setLoading(false);
        }} placeholder="Enter shipment number" aria-label="Shipment number" required maxLength={80} autoCapitalize="characters" spellCheck={false} />
        <Button type="submit" disabled={loading || !tracking.trim()} className="gap-2 whitespace-nowrap disabled:opacity-50">
          <Search size={18} /> {loading ? "Searching…" : "Track Cargo"}
        </Button>
      </form>
      <div aria-live="polite" aria-busy={loading}>
        {message && <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">{message}</p>}
        {result && <div className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Shipment" value={result.shipmentNumber} />
            <Info label="Status" value={result.isOnHold ? "On hold" : result.statusLabel || result.status} />
            <Info label="Location" value={result.currentLocation || "—"} />
            <Info label="Last updated" value={dateLabel(result.lastUpdate)} />
            <Info label="Origin" value={result.origin || "—"} />
            <Info label="Destination" value={result.destination || "—"} />
          </div>
          {!compact && Array.isArray(result.history) && result.history.length > 0 && <ol className="mt-6 space-y-4 border-l-2 border-brand-secondary pl-4">
            {result.history.map((event, index) => <li key={`${event.time}-${index}`}>
              <p className="font-bold">{event.label || event.status}</p>
              <p className="text-sm text-slate-500">{dateLabel(event.time)}{event.location ? ` · ${event.location}` : ""}</p>
              {event.description && <p className="mt-1 text-sm">{event.description}</p>}
            </li>)}
          </ol>}
        </div>}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words font-black text-brand-primary dark:text-white">{value}</p></div>;
}
