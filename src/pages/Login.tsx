import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";
import { Bot, Code2, HardDrive, Radio, Users } from "lucide-react";

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

const features = [
  {
    icon: Code2,
    title: "Build projects",
    text: "Create files, folders, and full coding projects directly in the browser.",
  },
  {
    icon: Radio,
    title: "Live coding",
    text: "Work alone, with friends, or with a team in shared project rooms.",
  },
  {
    icon: HardDrive,
    title: "Connect your device",
    text: "Use the OCNE desktop agent to save code locally and run terminal commands on your computer.",
  },
  {
    icon: Bot,
    title: "AI assistance",
    text: "Prepare reviews, explain code, and plan changes with an optional project AI agent.",
  },
];

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
    <div className="min-h-screen bg-[#070a12] px-4 py-8 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-2xl border border-white/10 bg-[#0d1220] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              <Users className="h-3.5 w-3.5" /> OCNE developer workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Code, collaborate, and run your projects from one place.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              OCNE was created so users can build websites and apps, organize project files, work live with other people, connect a real computer terminal, and bring projects online when they are ready to share.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <feature.icon className="mb-3 h-5 w-5 text-cyan-300" />
                <h2 className="text-sm font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">{feature.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-sm font-semibold text-emerald-100">Created by Busher Smakie</div>
            <p className="mt-2 text-xs leading-5 text-emerald-50/80">
              Busher Smakie is a developer from Aleppo, Syria. He learned information technology through apps and website development, and his goal with OCNE is to help people learn, create, collaborate, and turn real project ideas into working websites and applications.
            </p>
          </div>
        </section>

        <Card className="w-full border-white/10 bg-[#111827]/80 shadow-2xl shadow-black/30 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              {isRegister ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isRegister ? "Join OCNE and start building" : "Sign in to continue building"}
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
                      className="border-white/10 bg-white/[0.04] text-white"
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
                      className="border-white/10 bg-white/[0.04] text-white"
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
                  className="border-white/10 bg-white/[0.04] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-white/10 bg-white/[0.04] text-white"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
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
                className="text-sm text-slate-400 transition-colors hover:text-white"
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
    </div>
  );
}
