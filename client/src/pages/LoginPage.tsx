import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/useAuth";
import { ApiError } from "../services/api";
import { homePath } from "../types/auth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!password) {
      nextErrors.password = "Password is required.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(email.trim(), password);
      navigate(homePath(user.role), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Sign-in could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">EduSupport</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Sign in to the help desk</h1>
        <p className="mt-2 text-sm text-slate-600">Students, staff, and managers use the same sign-in.</p>
      </div>
      <Card>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {registered ? (
            <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900" role="status">
              Account created. Sign in with the email and password you just chose.
            </p>
          ) : null}
          {error ? <Alert>{error}</Alert> : null}
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          New student?{" "}
          <Link className="font-semibold text-teal-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800" to="/register">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
