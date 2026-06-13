"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Mail, Lock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Helper function to merge class names
const cn = (...classes: string[]) => {
  return classes.filter(Boolean).join(" ");
};

// Custom Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}

const Button = ({ children, variant = "default", className = "", ...props }: ButtonProps) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variantStyles = {
    default:
      "bg-brand-500 bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600 shadow-md shadow-brand-500/10",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Custom Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input = ({ className = "", ...props }: InputProps) => {
  return (
    <input
      className={`flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

const DotHeart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Generate dots forming a heart shape
  const generateDots = (width: number, height: number) => {
    const dots = [];
    const gap = 12;
    const dotRadius = 1.2;
    const scale = Math.min(width, height) * 0.28;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        // Map coordinates relative to center, with Y inverted
        const dx = (x - width / 2) / scale;
        const dy = -(y - height / 2 - 20) / scale; // shift down slightly

        // Heart shape mathematical equation
        const equation = Math.pow(dx * dx + dy * dy - 1, 3) - dx * dx * dy * dy * dy;
        const isInHeart = equation <= 0;

        if (isInHeart && Math.random() > 0.15) {
          dots.push({
            x,
            y,
            radius: dotRadius,
            opacity: Math.random() * 0.4 + 0.3,
          });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas.parentElement as Element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;
    const startTime = Date.now();

    // Define glowing pulse routes flowing through the heart
    const routes = [
      {
        points: [
          { x: dimensions.width * 0.2, y: dimensions.height * 0.5 },
          { x: dimensions.width * 0.35, y: dimensions.height * 0.3 },
          { x: dimensions.width * 0.5, y: dimensions.height * 0.6 },
          { x: dimensions.width * 0.65, y: dimensions.height * 0.3 },
          { x: dimensions.width * 0.8, y: dimensions.height * 0.5 },
        ],
        delay: 0,
        color: "rgba(14, 165, 233, 0.8)", // Sky blue
      },
      {
        points: [
          { x: dimensions.width * 0.3, y: dimensions.height * 0.6 },
          { x: dimensions.width * 0.5, y: dimensions.height * 0.35 },
          { x: dimensions.width * 0.7, y: dimensions.height * 0.6 },
        ],
        delay: 1.5,
        color: "rgba(2, 132, 199, 0.8)", // Brand primary
      },
    ];

    function drawDots() {
      if (!ctx) return;
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(14, 165, 233, ${dot.opacity})`;
        ctx.fill();
      });
    }

    function drawPulse(points: { x: number; y: number }[], progress: number) {
      if (!ctx || points.length < 2 || progress <= 0) return;

      const totalSegments = points.length - 1;
      const segmentProgress = progress * totalSegments;
      const currentSegmentIndex = Math.floor(segmentProgress);
      const remainder = segmentProgress - currentSegmentIndex;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      // Draw completed segments
      for (let i = 0; i < currentSegmentIndex; i++) {
        ctx.lineTo(points[i + 1].x, points[i + 1].y);
      }

      // Draw current segment
      if (currentSegmentIndex < totalSegments) {
        const start = points[currentSegmentIndex];
        const end = points[currentSegmentIndex + 1];
        const currentX = start.x + (end.x - start.x) * remainder;
        const currentY = start.y + (end.y - start.y) * remainder;
        ctx.lineTo(currentX, currentY);

        // Draw glowing point
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(currentX, currentY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      } else {
        ctx.stroke();
      }
    }

    function animate() {
      if (!ctx) return;
      drawDots();

      const elapsedSeconds = (Date.now() - startTime) / 1000;

      routes.forEach((route) => {
        const relativeTime = elapsedSeconds - route.delay;
        if (relativeTime <= 0) return;

        const duration = 2.5; // loop duration
        const progress = Math.min((relativeTime % 4) / duration, 1); // 4 seconds total cycle

        ctx.strokeStyle = route.color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        drawPulse(route.points, progress);
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

interface SignInCardProps {
  defaultMode?: "signin" | "signup";
}

const SignInCard = ({ defaultMode = "signin" }: SignInCardProps) => {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(defaultMode === "signup");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState("");
  const [authMethod, setAuthMethod] = useState<"magic_link" | "password">("magic_link");
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }
        if (!email || !password) {
          setError("Please fill in all required fields.");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) throw signUpError;

        setError("Registration successful! Check your email to confirm your account.");
      } else {
        if (authMethod === "magic_link") {
          if (!email) {
            setError("Please enter your email.");
            setLoading(false);
            return;
          }

          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (otpError) throw otpError;

          setIsMagicLinkSent(true);
        } else {
          if (!email || !password) {
            setError("Please enter your email and password.");
            setLoading(false);
            return;
          }

          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) throw signInError;

          localStorage.setItem("zh_login_time", new Date().toISOString());
          router.push("/dashboard");
        }
      }
    } catch (err) {
      console.error("Auth submission error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed. Verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-full items-center justify-center max-w-5xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full overflow-hidden rounded-[2.5rem] flex bg-white shadow-xl border border-slate-100 min-h-[620px]"
      >
        {/* Left side - Branded Canvas & Overlay */}
        <div className="hidden md:block w-1/2 relative overflow-hidden border-r border-slate-50 bg-gradient-to-br from-brand-50 to-brand-100/50">
          <div className="absolute inset-0">
            <DotHeart />

            {/* Logo and text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-between p-12 z-10">
              <div
                className="flex items-center gap-2 cursor-pointer self-start"
                onClick={() => router.push("/")}
              >
                <Image
                  src="/logo/image/logo.png"
                  alt="ZorabiHealth"
                  width={140}
                  height={40}
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-md mb-6 border border-slate-100"
                >
                  <ShieldCheck className="text-brand-500 h-7 w-7" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-2xl font-black mb-3 text-slate-800 tracking-tight"
                >
                  Predictive Clinical GenAI
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm text-slate-600 max-w-xs leading-relaxed font-medium"
                >
                  Access your clinical dashboard to view analytics, track outpatient indicator logs,
                  and log health metrics.
                </motion.p>
              </div>

              <div className="text-xs text-slate-400 font-semibold self-center">
                Secure 256-bit SSL Encryption
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? "signup" : isMagicLinkSent ? "sent" : "signin"}
              initial={{ opacity: 0, x: isSignUp ? 15 : -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isSignUp ? -15 : 15 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-3xl font-black mb-2 text-slate-800 tracking-tight">
                {isSignUp ? "Create account" : "Welcome back"}
              </h1>
              <p className="text-slate-500 mb-8 font-medium">
                {isSignUp
                  ? "Sign up to access the intelligence platform"
                  : "Sign in to access your health portal"}
              </p>

              {error && (
                <div className="mb-5 p-3.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                  {error}
                </div>
              )}

              {isMagicLinkSent ? (
                <div className="text-center space-y-6 py-6">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-sm">
                    <Mail className="h-8 w-8 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                      Check your email
                    </h2>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                      We have sent a secure magic link to{" "}
                      <strong className="text-slate-700">{email}</strong>. Click the link to log in
                      instantly.
                    </p>
                  </div>
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setIsMagicLinkSent(false)}
                      className="w-full py-3 h-12 rounded-xl text-slate-600 font-bold"
                    >
                      ← Back to sign in
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isSignUp && (
                    <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("magic_link");
                          setError("");
                        }}
                        className={cn(
                          "w-1/2 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                          authMethod === "magic_link"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Magic Link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("password");
                          setError("");
                        }}
                        className={cn(
                          "w-1/2 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                          authMethod === "password"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Password
                      </button>
                    </div>
                  )}

                  {isSignUp && (
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                      >
                        Full Name <span className="text-brand-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Dr. Alexander Flemming"
                          required
                          className="pl-10"
                        />
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Clinical Email <span className="text-brand-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alexander@zorabihealth.com"
                        required
                        className="pl-10"
                      />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {(isSignUp || authMethod === "password") && (
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                      >
                        Password <span className="text-brand-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={isPasswordVisible ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="pl-10 pr-10"
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        >
                          {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {isSignUp && (
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                      >
                        Confirm Password <span className="text-brand-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={isPasswordVisible ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="pl-10 pr-10"
                        />
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onHoverStart={() => setIsHovered(true)}
                    onHoverEnd={() => setIsHovered(false)}
                    className="pt-4"
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className={cn(
                        "w-full py-3 h-12 rounded-xl text-white font-bold relative overflow-hidden transition-all duration-300",
                        isHovered ? "shadow-lg shadow-brand-500/20" : "",
                        loading ? "opacity-70 pointer-events-none" : ""
                      )}
                    >
                      <span className="flex items-center justify-center">
                        {loading
                          ? "Processing..."
                          : isSignUp
                            ? "Register"
                            : authMethod === "magic_link"
                              ? "Send Magic Link"
                              : "Sign in"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                      {isHovered && !loading && (
                        <motion.span
                          initial={{ left: "-100%" }}
                          animate={{ left: "100%" }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                          className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          style={{ filter: "blur(8px)" }}
                        />
                      )}
                    </Button>
                  </motion.div>

                  <div className="text-center mt-6 text-sm text-slate-500 font-semibold">
                    {isSignUp ? (
                      <p>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setIsSignUp(false);
                            setError("");
                          }}
                          className="text-brand-600 hover:text-brand-700 underline font-bold"
                        >
                          Sign in
                        </button>
                      </p>
                    ) : (
                      <p>
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setIsSignUp(true);
                            setError("");
                          }}
                          className="text-brand-600 hover:text-brand-700 underline font-bold"
                        >
                          Sign up
                        </button>
                      </p>
                    )}
                  </div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const Index = ({ defaultMode = "signin" }: SignInCardProps) => {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background abstract layout elements */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-brand-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-300/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      {/* Floating back to home link */}
      <button
        onClick={() => router.push("/")}
        className="absolute top-6 right-6 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors flex items-center gap-1.5"
      >
        ← Back to landing
      </button>

      <SignInCard defaultMode={defaultMode} />
    </div>
  );
};

export default Index;
