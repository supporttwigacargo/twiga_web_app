import type { Metadata } from "next";
import { TrackingLookup } from "@/components/sections/tracking-lookup";
import { SectionHeader } from "@/components/sections/section-header";

export const metadata: Metadata = {
  title: "Shipment Tracking",
  description: "Track Twiga Star Cargo shipments with shipment number, status, current location, and timeline history.",
};

export default function TrackingPage() {
  return (
    <main className="container-px py-20">
      <SectionHeader title="Track Your Shipment" text="Enter your cargo tracking number to see shipment status, current location, and timeline history." />
      <div className="mx-auto mt-10 max-w-5xl">
        <TrackingLookup />
      </div>
    </main>
  );
}
