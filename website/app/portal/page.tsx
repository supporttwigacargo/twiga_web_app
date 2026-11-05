import type { Metadata } from "next";
import { PortalClient } from "@/components/sections/portal-client";
import { SectionHeader } from "@/components/sections/section-header";

export const metadata: Metadata = {
  title: "Customer Portal",
  description: "Twiga Star Cargo customer portal for login, registration, shipment history, invoices, notifications, and profile management.",
};

export default function PortalPage() {
  return (
    <main className="container-px py-20">
      <SectionHeader title="Customer Portal" text="Login, manage shipments, view invoices, receive notifications, and update customer profile details." />
      <div className="mt-12">
        <PortalClient />
      </div>
    </main>
  );
}

