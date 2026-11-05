import {
  BadgeCheck,
  Boxes,
  Building2,
  Clock3,
  FileCheck2,
  Globe2,
  Headphones,
  Plane,
  Sailboat,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Warehouse,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/tracking", label: "Tracking" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/portal", label: "Portal" },
];

export const features = [
  { title: "Fast Delivery", text: "Air, sea, and road routes planned around your deadlines.", icon: Clock3 },
  { title: "Secure Shipping", text: "Careful handling, documentation, and status visibility.", icon: ShieldCheck },
  { title: "Real-Time Tracking", text: "A clear tracking journey from pickup to final delivery.", icon: Globe2 },
  { title: "Affordable Rates", text: "Competitive AED and TZS options for personal and business cargo.", icon: BadgeCheck },
];

export const services = [
  {
    group: "Cargo Services",
    items: [
      { title: "Air Freight", icon: Plane, text: "Fast cargo movement from UAE to East Africa and beyond." },
      { title: "Sea Freight", icon: Sailboat, text: "Container and consolidated cargo for larger shipment volumes." },
      { title: "Road Freight", icon: Truck, text: "Regional pickup, dispatch, and last-mile delivery coordination." },
      { title: "Express Cargo", icon: Boxes, text: "Priority movement for urgent documents, parcels, and stock." },
    ],
  },
  {
    group: "Business Services",
    items: [
      { title: "Product Sourcing", icon: ShoppingBag, text: "Find products and suppliers for trade and retail operations." },
      { title: "Procurement", icon: FileCheck2, text: "Order management, buying support, and shipment preparation." },
      { title: "Quality Inspection", icon: BadgeCheck, text: "Pre-shipment checks to reduce costly cargo surprises." },
      { title: "Supplier Verification", icon: Building2, text: "Basic supplier screening and trade confidence support." },
    ],
  },
  {
    group: "Logistics Services",
    items: [
      { title: "Warehousing", icon: Warehouse, text: "Short-term cargo storage before consolidation or dispatch." },
      { title: "Consolidation", icon: Boxes, text: "Combine multiple supplier orders into efficient shipments." },
      { title: "Customs Clearance", icon: FileCheck2, text: "Documentation guidance through clearance stages." },
      { title: "Door-to-Door Delivery", icon: Truck, text: "End-to-end movement from pickup point to destination address." },
    ],
  },
  {
    group: "Ecommerce Logistics",
    items: [
      { title: "Fulfillment", icon: Warehouse, text: "Storage, packing, dispatch, and customer delivery support." },
      { title: "COD Delivery", icon: Headphones, text: "Cash-on-delivery workflows for local ecommerce sellers." },
      { title: "Last Mile Delivery", icon: Truck, text: "Reliable delivery handoff for customer-facing shipments." },
    ],
  },
];

export const stats = [
  { label: "Shipments Delivered", value: "2.4K" },
  { label: "Happy Clients", value: "95%" },
  { label: "Founded", value: "2023" },
];

export const testimonials = [
  {
    name: "Mariam K.",
    role: "Retail Importer",
    quote: "Twiga Star Cargo gives clear updates and dependable delivery windows. That has made planning stock much easier.",
  },
  {
    name: "Hassan M.",
    role: "Auto Parts Trader",
    quote: "Their UAE to Tanzania coordination is professional, fast, and easy to follow from pickup to clearance.",
  },
  {
    name: "Neema S.",
    role: "Online Seller",
    quote: "The team helped us consolidate products from different suppliers and reduce our shipping costs.",
  },
];

export const news = [
  { title: "How to prepare cargo for air freight", date: "Logistics Guide", text: "Packaging and documentation steps that speed up dispatch." },
  { title: "Sea cargo consolidation explained", date: "Shipping Tips", text: "When consolidated freight makes the most sense for growing traders." },
  { title: "Why supplier verification matters", date: "Procurement", text: "Reduce procurement risk before payment and shipment." },
];

export const timeline = [
  "Founded in 2023 in Dubai to support UAE cargo customers.",
  "Opened regular UAE to Tanzania cargo routes.",
  "Added procurement, sourcing, and inspection services.",
  "Expanded customer portal and shipment tracking workflows.",
];

export const sampleTracking = {
  number: "TSC-2026-4819",
  status: "In Transit",
  location: "Dubai Cargo Village, UAE",
  deliveryDate: "18 June 2026",
  history: [
    { title: "Shipment booked", time: "10 Jun 2026, 09:20", place: "Dubai Office" },
    { title: "Cargo received", time: "10 Jun 2026, 14:10", place: "Warehouse" },
    { title: "Export processing", time: "11 Jun 2026, 08:30", place: "Dubai Cargo Village" },
    { title: "In transit", time: "Current", place: "UAE to Tanzania route" },
  ],
};
