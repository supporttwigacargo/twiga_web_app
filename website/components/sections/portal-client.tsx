"use client";

import { useState } from "react";
import { Bell, FileText, History, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";

type Mode = "login" | "register" | "forgot" | "dashboard";

export function PortalClient() {
  const [mode, setMode] = useState<Mode>("login");

  if (mode === "dashboard") {
    return <Dashboard onLogout={() => setMode("login")} />;
  }

  return (
    <Card className="mx-auto max-w-xl p-6 shadow-premium">
      <h1 className="text-3xl font-black text-brand-primary">
        {mode === "login" ? "Customer Login" : mode === "register" ? "Create Account" : "Recover Password"}
      </h1>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setMode("dashboard");
        }}
      >
        {mode === "register" ? <Input placeholder="Full name" required /> : null}
        <Input type="email" placeholder="Email address" required />
        {mode !== "forgot" ? <Input type="password" placeholder="Password" required /> : null}
        <Button type="submit">{mode === "forgot" ? "Send Reset Link" : mode === "register" ? "Register" : "Login"}</Button>
      </form>
      <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-brand-primary">
        <button type="button" onClick={() => setMode("login")}>Login</button>
        <button type="button" onClick={() => setMode("register")}>Register</button>
        <button type="button" onClick={() => setMode("forgot")}>Forgot Password</button>
      </div>
    </Card>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const items = [
    { title: "Shipment History", value: "12 records", icon: History },
    { title: "Invoices", value: "3 pending", icon: FileText },
    { title: "Notifications", value: "5 updates", icon: Bell },
    { title: "Profile Management", value: "Verified", icon: UserRound },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-brand-primary">Customer Dashboard</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Supabase Auth-ready portal experience.</p>
        </div>
        <Button variant="secondary" onClick={onLogout}>Logout</Button>
      </div>
      <div className="grid gap-5 md:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card className="p-6" key={item.title}>
              <Icon className="mb-4 text-brand-secondary" />
              <h2 className="font-black">{item.title}</h2>
              <p className="mt-2 text-slate-500">{item.value}</p>
            </Card>
          );
        })}
      </div>
      <Card className="overflow-hidden">
        <div className="grid min-w-[720px] grid-cols-4 bg-slate-50 p-4 text-sm font-black text-slate-500 dark:bg-slate-950">
          <span>Shipment</span><span>Route</span><span>Status</span><span>Invoice</span>
        </div>
        {["TSC-2026-4819", "TSC-2026-4820", "TSC-2026-4821"].map((code, index) => (
          <div className="grid min-w-[720px] grid-cols-4 border-t border-slate-200 p-4 dark:border-slate-800" key={code}>
            <span className="font-black text-brand-primary">{code}</span>
            <span>Dubai to Dar es Salaam</span>
            <span>{index === 0 ? "In Transit" : "Processing"}</span>
            <span>AED {(index + 1) * 420}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

