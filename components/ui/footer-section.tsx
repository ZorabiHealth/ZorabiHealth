"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Facebook,
  Instagram,
  Linkedin,
  Moon,
  Send,
  Shield,
  Sun,
  Twitter,
  HeartPulse,
} from "lucide-react";

function Footerdemo() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <footer className="relative border-t bg-white text-slate-800 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8 max-w-7xl">
        <div className="grid gap-8 sm:gap-12 grid-cols-2 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Newsletter */}
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo/image/logo.png"
                alt="ZorabiHealth"
                width={140}
                height={40}
                className="object-contain"
              />
            </div>
            <p className="mb-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
              Your personal AI-powered health companion. Track medications, monitor vitals, and stay
              on top of your wellness journey.
            </p>
            <div className="flex items-center gap-2 mb-6 text-xs text-slate-400 dark:text-slate-500">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              HIPAA-aligned &bull; SSL encrypted &bull; SOC 2
            </div>
            <h3 className="mb-2 text-sm font-semibold text-brand-900 dark:text-brand-400">
              Stay Connected
            </h3>
            <form className="relative max-w-sm">
              <Input
                type="email"
                placeholder="Enter your clinical email"
                className="pr-12 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-brand-600 hover:bg-brand-700 text-white transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-brand-900 dark:text-brand-400 uppercase tracking-wider">
              Platform
            </h3>
            <nav className="space-y-2.5 text-sm">
              <Link
                href="/dashboard"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                Patient Portal
              </Link>
              <Link
                href="/dashboard/pharmacy"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                Pharmacy
              </Link>
              <Link
                href="/dashboard/medications"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                Medications
              </Link>
              <Link
                href="/dashboard/voice"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                Voice Assistant
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-brand-900 dark:text-brand-400 uppercase tracking-wider">
              Resources
            </h3>
            <nav className="space-y-2.5 text-sm">
              <Link
                href="/dashboard"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                Clinical Dashboard
              </Link>
              <Link
                href="#"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                Help &amp; Support
              </Link>
              <Link
                href="#"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                API Docs
              </Link>
              <Link
                href="#"
                className="block transition-colors hover:text-brand-600 text-slate-600 dark:text-slate-400"
              >
                Status
              </Link>
            </nav>
          </div>

          {/* Connect */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-brand-900 dark:text-brand-400 uppercase tracking-wider">
              Connect
            </h3>
            <div className="mb-6 flex flex-wrap gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://facebook.com/zorabihealth"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full border-slate-200 hover:bg-slate-50 dark:border-gray-700 h-9 w-9"
                      >
                        <Facebook className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <span className="sr-only">Facebook</span>
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Facebook</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://twitter.com/zorabihealth"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full border-slate-200 hover:bg-slate-50 dark:border-gray-700 h-9 w-9"
                      >
                        <Twitter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <span className="sr-only">Twitter</span>
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Twitter</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://instagram.com/zorabihealth"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full border-slate-200 hover:bg-slate-50 dark:border-gray-700 h-9 w-9"
                      >
                        <Instagram className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <span className="sr-only">Instagram</span>
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Instagram</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://linkedin.com/company/zorabihealth"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full border-slate-200 hover:bg-slate-50 dark:border-gray-700 h-9 w-9"
                      >
                        <Linkedin className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <span className="sr-only">LinkedIn</span>
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Connect with us on LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4 text-slate-500" />
              <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={setIsDarkMode} />
              <Moon className="h-4 w-4 text-slate-500" />
              <Label htmlFor="dark-mode" className="sr-only">
                Toggle dark mode
              </Label>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 dark:border-gray-800 pt-8 text-center md:flex-row">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <HeartPulse className="h-4 w-4 text-brand-500" />
            &copy; 2026 ZorabiHealth. All rights reserved.
          </div>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/privacy"
              className="transition-colors hover:text-brand-600 text-slate-500 dark:text-slate-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-brand-600 text-slate-500 dark:text-slate-400"
            >
              Terms of Service
            </Link>
            <Link
              href="/cookies"
              className="transition-colors hover:text-brand-600 text-slate-500 dark:text-slate-400"
            >
              Cookie Settings
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export { Footerdemo };
