import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ApiError } from "../services/api";
import { registerRequest } from "../services/auth.service";

function passwordError(password: string): string | undefined {
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Use 8 to 72 characters with at least one letter and one number.";
  }
  return undefined;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      nextErrors.name = "Name must be between 2 and 80 characters.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    const passwordMessage = passwordError(password);
    if (passwordMessage) {
      nextErrors.password = passwordMessage;
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await registerRequest(trimmedName, email.trim(), password);
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Registration could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">EduSupport</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Create a student account</h1>
        <p className="mt-2 text-sm text-slate-600">Registration is for students. Staff and manager accounts are issued separately.</p>
      </div>
      <Card>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {error ? <Alert>{error}</Alert> : null}
          <Input label="Full name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} error={fieldErrors.name} />
          <Input label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={fieldErrors.email} />
          <Input label="Password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} />
          <Input label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} error={fieldErrors.confirmPassword} />
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-semibold text-teal-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800" to="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
