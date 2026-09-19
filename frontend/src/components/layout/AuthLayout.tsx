import { Outlet } from "react-router-dom";
import { ShieldCheck, Boxes, LineChart } from "lucide-react";

import { AppMark } from "./AppMark";

const HIGHLIGHTS = [
  {
    icon: Boxes,
    title: "One register for every asset",
    body: "Hardware and software tracked from procurement through to retirement.",
  },
  {
    icon: ShieldCheck,
    title: "Accountable by default",
    body: "Every assignment, transfer and return is attributed and timestamped.",
  },
  {
    icon: LineChart,
    title: "Reporting that holds up",
    body: "Utilisation, ageing and depreciation ready for audit and budget cycles.",
  },
];

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* ======================================================
          BRAND PANEL
      ====================================================== */}

      <div className="hidden w-1/2 flex-col justify-between bg-brand-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <AppMark size="lg" inverted />

          <div>
            <p className="text-sm font-semibold">IT Asset Management</p>
            <p className="text-xs text-brand-300">Administration Portal</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Manage your IT estate from one place.
          </h1>

          <p className="mt-4 text-sm leading-6 text-brand-200">
            Users, inventory, assignments, requests and reporting — governed by
            a single source of truth.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-800">
                  <item.icon className="h-4 w-4 text-brand-200" />
                </span>

                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-brand-300">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-brand-400">
          © {new Date().getFullYear()} IT Asset Management System
        </p>
      </div>

      {/* ======================================================
          FORM PANEL
      ====================================================== */}

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <AppMark />

            <div>
              <p className="text-sm font-semibold text-foreground">
                IT Asset Management
              </p>
              <p className="text-xs text-muted-foreground">
                Administration Portal
              </p>
            </div>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
