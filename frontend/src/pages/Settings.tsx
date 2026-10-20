import { Link } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "../services/context/AuthContext";

// ============================================================
// SETTINGS
//
// Only shows what the system can actually do today: the signed-in
// user's real account details, sign out, and the way to manage other
// people's access. Organisation-wide preferences have no backend yet,
// so no controls are shown for them.
// ============================================================

function formatRole(role?: string) {
  if (!role) return "No role assigned";

  return role
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Settings() {
  const { user, logout } = useAuth();

  const details = [
    { label: "Name", value: user?.name || "—" },
    { label: "Email", value: user?.email || "—" },
    { label: "Role", value: formatRole(user?.role) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader
        title="Settings"
        description="Your account details, and where to manage access for other people."
      />

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>
            The account you are signed in with. To change your name, email or
            role, ask an administrator.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <dl className="divide-y divide-border rounded-lg border border-border">
            {details.map((item) => (
              <div
                key={item.label}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4"
              >
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="min-w-0 break-words text-sm font-medium text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <Button type="button" variant="outline" onClick={() => logout()}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who can use ITAM</CardTitle>
          <CardDescription>
            Add people, change what they are allowed to do, or turn off their
            access from Users &amp; Roles.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Link
            to="/users-roles"
            className={buttonVariants({ variant: "outline" })}
          >
            <ShieldCheck aria-hidden="true" />
            Open Users &amp; Roles
          </Link>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Organisation-wide preferences, such as notification rules and transfer
        approvals, are not configurable in this version of ITAM.
      </p>
    </div>
  );
}
