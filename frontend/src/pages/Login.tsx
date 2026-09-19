import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";

import { Button } from "../components/ui/button";
import { useAuth } from "../services/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOGIN
  // ============================================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(email, password);

      // In-app navigation only — no full page reload.
      // By the time login() resolves, AuthContext has already
      // flushSync'd isAuthenticated to true, so this is safe
      // and instant. (RequireGuest in App.tsx would also catch
      // this on its own, but navigating explicitly here keeps
      // intent clear and leaves room for a "redirect to
      // originally requested page" feature later.)
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to access your IT Management account.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>

            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                // TODO: Forgot password flow
              }}
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive-border bg-destructive-muted px-3 py-2.5 text-sm text-destructive-strong">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          loading={loading}
          size="lg"
          className="h-11 w-full justify-center"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/* Security Message */}
      <div className="mt-8 border-t border-border pt-5">
        <p className="text-center text-xs leading-5 text-muted-foreground">
          Your account access is protected by secure authentication. Contact
          your system administrator if you need assistance.
        </p>
      </div>
    </div>
  );
}
