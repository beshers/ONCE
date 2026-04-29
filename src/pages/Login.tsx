import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAuthErrorMessage(message: string) {
  try {
    const parsed = JSON.parse(message);
    if (
      Array.isArray(parsed) &&
      parsed.some((issue) => issue?.path?.includes("email"))
    ) {
      return "Enter a valid email address.";
    }
    if (
      Array.isArray(parsed) &&
      parsed.some((issue) => issue?.path?.includes("password"))
    ) {
      return "Password must be at least 6 characters.";
    }
  } catch {
    // Non-JSON tRPC messages are handled below.
  }

  if (message.toLowerCase().includes("invalid email")) {
    return "Enter a valid email address.";
  }

  return message || "Something went wrong. Please try again.";
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();
  const loginMut = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        utils.auth.me.invalidate();
        window.location.href = "/";
      } else {
        setError(data.message || "Login failed");
      }
      setLoading(false);
    },
    onError: (err) => {
      setError(getAuthErrorMessage(err.message));
      setLoading(false);
    },
  });

  const registerMut = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        utils.auth.me.invalidate();
        window.location.href = "/";
      } else {
        setError(data.message || "Registration failed");
      }
      setLoading(false);
    },
    onError: (err) => {
      setError(getAuthErrorMessage(err.message));
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }

    if (isRegister && password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (isRegister) {
      registerMut.mutate({
        email: normalizedEmail,
        password,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      });
    } else {
      loginMut.mutate({ email: normalizedEmail, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">
            {isRegister ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {isRegister ? "Sign up to get started" : "Sign in to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isRegister ? (
                <>Already have an account? <span className="text-cyan-400">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-cyan-400">Sign up</span></>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
