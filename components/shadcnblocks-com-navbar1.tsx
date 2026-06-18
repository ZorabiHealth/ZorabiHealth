"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Book,
  BookOpen,
  FileCode,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Microscope,
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
  isSection?: boolean;
  badge?: string;
}

interface Navbar1Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  menu?: MenuItem[];
  mobileExtraLinks?: {
    name: string;
    url: string;
  }[];
  auth?: {
    login: {
      text: string;
      url: string;
    };
    signup: {
      text: string;
      url: string;
    };
  };
}

const Navbar1 = ({
  logo = {
    url: "/",
    src: "/logo/image/logo.png",
    alt: "ZorabiHealth",
    title: "ZorabiHealth",
  },
  menu = [
    { title: "Home", url: "/" },
    {
      title: "Products",
      url: "#",
      items: [
        { title: "Products", url: "#", isSection: true },
        {
          title: "AI Voice Assistant",
          description: "Speech-to-text wellness logging powered by Deepgram.",
          icon: <Sparkles className="size-5 shrink-0 text-violet-500" />,
          url: "/dashboard/voice",
        },
        {
          title: "Automated Refills",
          description: "Auto-vendor stock routing and real-time dispatch.",
          icon: <Zap className="size-5 shrink-0 text-emerald-500" />,
          url: "/dashboard/pharmacy",
        },
        {
          title: "Push Alerts",
          description: "Real-time push with clinical escalation triggers.",
          icon: <Activity className="size-5 shrink-0 text-amber-500" />,
          url: "/dashboard/medications",
        },
        { title: "Use Cases", url: "#", isSection: true },
        {
          title: "Chronic Care Management",
          description: "End-to-end care coordination across specialties.",
          icon: <HeartPulse className="size-5 shrink-0 text-rose-500" />,
          url: "#",
        },
        {
          title: "Medication Adherence",
          description: "Automated refill routing and compliance tracking.",
          icon: <Pill className="size-5 shrink-0 text-emerald-500" />,
          url: "#",
        },
        {
          title: "Remote Patient Monitoring",
          description: "Real-time vitals and clinical telemetry dashboards.",
          icon: <Microscope className="size-5 shrink-0 text-cyan-500" />,
          url: "#",
        },
        {
          title: "Clinical Decision Support",
          description: "AI-driven insights for care teams.",
          icon: <Stethoscope className="size-5 shrink-0 text-blue-500" />,
          url: "#",
        },
        { title: "Documentation", url: "#", isSection: true },
        {
          title: "API Reference",
          description: "REST and WebSocket endpoints for all platform services.",
          icon: <FileCode className="size-5 shrink-0 text-indigo-500" />,
          url: "#",
        },
        {
          title: "Integration Guide",
          description: "Connect your EHR, pharmacy, and lab systems.",
          icon: <BookOpen className="size-5 shrink-0 text-sky-500" />,
          url: "#",
        },
        {
          title: "SDK Quickstart",
          description: "Client libraries for Python, TypeScript, and Swift.",
          icon: <FlaskConical className="size-5 shrink-0 text-teal-500" />,
          url: "#",
        },
        {
          title: "Compliance & Security",
          description: "HIPAA, SOC 2, and data residency documentation.",
          icon: <Shield className="size-5 shrink-0 text-slate-500" />,
          url: "#",
        },
      ],
    },
    {
      title: "Resources",
      url: "#",
      items: [
        {
          title: "Patient Portal",
          description: "Access your clinical indicators and telemetry logs.",
          icon: <LayoutDashboard className="size-5 shrink-0 text-blue-500" />,
          url: "/dashboard",
        },
        {
          title: "Documentation",
          description: "Guides, tutorials, and platform reference.",
          icon: <FileText className="size-5 shrink-0 text-slate-600" />,
          url: "#",
        },
        {
          title: "API Reference",
          description: "Full API specification with interactive playground.",
          icon: <FileCode className="size-5 shrink-0 text-indigo-500" />,
          url: "#",
        },
        {
          title: "Help Center",
          description: "FAQs, troubleshooting, and community forums.",
          icon: <Users className="size-5 shrink-0 text-amber-500" />,
          url: "#",
        },
        {
          title: "Clinical Verification",
          description: "Read about our compliance standards and HIPAA privacy alignment.",
          icon: <Shield className="size-5 shrink-0 text-emerald-500" />,
          url: "#",
        },
      ],
    },
    { title: "Pricing", url: "#" },
  ],
  mobileExtraLinks = [
    { name: "Clinical Safety", url: "#" },
    { name: "Help & Support", url: "#" },
    { name: "API Docs", url: "#" },
    { name: "Status", url: "#" },
  ],
  auth = {
    login: { text: "Log in", url: "/login" },
    signup: { text: "Sign up", url: "/signup" },
  },
}: Navbar1Props) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="w-full px-6 lg:px-10">
        <nav className="hidden justify-between lg:flex h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href={logo.url} className="flex items-center gap-2 shrink-0">
              <Image
                src={logo.src}
                alt={logo.alt}
                width={160}
                height={45}
                className="object-contain"
                style={{ width: "auto", height: "2.5rem" }}
                priority
                unoptimized
              />
            </Link>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>{menu.map((item) => renderMenuItem(item))}</NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-slate-600 hover:text-slate-900"
            >
              <Link href={auth.login.url}>{auth.login.text}</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg shadow-brand-200 hover:shadow-brand-300 transition-all"
            >
              <Link href={auth.signup.url}>{auth.signup.text}</Link>
            </Button>
          </div>
        </nav>

        {/* Mobile */}
        <div className="flex lg:hidden h-16 items-center justify-between">
          <Link href={logo.url} className="flex items-center gap-2 shrink-0">
            <Image
              src={logo.src}
              alt={logo.alt}
              width={140}
              height={40}
              className="object-contain"
              style={{ width: "auto", height: "2.25rem" }}
              priority
              unoptimized
            />
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-700">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto border-l-0 bg-white/95 backdrop-blur-xl">
              <SheetHeader className="border-b border-slate-100 pb-4">
                <SheetTitle>
                  <Link
                    href={logo.url}
                    className="flex items-center gap-2 shrink-0"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Image
                      src={logo.src}
                      alt={logo.alt}
                      width={140}
                      height={40}
                      className="object-contain"
                      style={{ width: "auto", height: "2.25rem" }}
                      priority
                      unoptimized
                    />
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="my-6 flex flex-col gap-6">
                <Accordion type="single" collapsible className="flex w-full flex-col gap-2">
                  {menu.map((item) => renderMobileMenuItem(item, () => setMobileOpen(false)))}
                </Accordion>
                <div className="border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-2 justify-start gap-1">
                    {mobileExtraLinks.map((link, idx) => (
                      <Link
                        key={idx}
                        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        href={link.url}
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href={auth.login.url} onClick={() => setMobileOpen(false)}>
                      {auth.login.text}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white"
                  >
                    <Link href={auth.signup.url} onClick={() => setMobileOpen(false)}>
                      {auth.signup.text}
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    const hasSections = item.items.some((si) => si.isSection);

    if (hasSections) {
      const sections: { title: string; items: MenuItem[] }[] = [];
      let current: { title: string; items: MenuItem[] } | null = null;
      for (const si of item.items) {
        if (si.isSection) {
          current = { title: si.title, items: [] };
          sections.push(current);
        } else if (current) {
          current.items.push(si);
        }
      }

      return (
        <NavigationMenuItem key={item.title} className="text-slate-500">
          <NavigationMenuTrigger className="text-sm font-medium">
            {item.title}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[750px] grid-cols-3 gap-0 p-4">
              {sections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map((subItem) => (
                      <li key={subItem.title}>
                        <NavigationMenuLink asChild>
                          <Link
                            className="flex select-none gap-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-50 hover:text-slate-900"
                            href={subItem.url}
                          >
                            {subItem.icon}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">
                                  {subItem.title}
                                </span>
                                {subItem.badge && (
                                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                                    {subItem.badge}
                                  </span>
                                )}
                              </div>
                              {subItem.description && (
                                <p className="text-xs leading-snug text-slate-500 mt-0.5">
                                  {subItem.description}
                                </p>
                              )}
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      );
    }

    return (
      <NavigationMenuItem key={item.title} className="text-slate-500">
        <NavigationMenuTrigger className="text-sm font-medium">{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="w-80 p-3">
            {item.items.map((subItem) => (
              <li key={subItem.title}>
                <NavigationMenuLink asChild>
                  <Link
                    className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-50 hover:text-slate-900"
                    href={subItem.url}
                  >
                    {subItem.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {subItem.title}
                        </span>
                        {subItem.badge && (
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                            {subItem.badge}
                          </span>
                        )}
                      </div>
                      {subItem.description && (
                        <p className="text-sm leading-snug text-slate-500 mt-0.5">
                          {subItem.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <Link
      key={item.title}
      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      href={item.url}
    >
      {item.title}
    </Link>
  );
};

const renderMobileMenuItem = (item: MenuItem, onClose: () => void) => {
  if (item.items) {
    const hasSections = item.items.some((si) => si.isSection);

    if (hasSections) {
      const sections: { title: string; items: MenuItem[] }[] = [];
      let current: { title: string; items: MenuItem[] } | null = null;
      for (const si of item.items) {
        if (si.isSection) {
          current = { title: si.title, items: [] };
          sections.push(current);
        } else if (current) {
          current.items.push(si);
        }
      }

      return (
        <AccordionItem key={item.title} value={item.title} className="border-b-0">
          <AccordionTrigger className="py-2 font-semibold text-slate-800 hover:no-underline">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="mt-1 space-y-4">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((subItem) => (
                    <Link
                      key={subItem.title}
                      className="flex select-none gap-3 rounded-md p-3 leading-none outline-none transition-colors hover:bg-slate-50 hover:text-slate-900"
                      href={subItem.url}
                      onClick={onClose}
                    >
                      {subItem.icon}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {subItem.title}
                          </span>
                          {subItem.badge && (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                              {subItem.badge}
                            </span>
                          )}
                        </div>
                        {subItem.description && (
                          <p className="text-xs leading-snug text-slate-500 mt-0.5">
                            {subItem.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      );
    }

    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="py-2 font-semibold text-slate-800 hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-1">
          {item.items.map((subItem) => (
            <Link
              key={subItem.title}
              className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-slate-50 hover:text-slate-900"
              href={subItem.url}
              onClick={onClose}
            >
              {subItem.icon}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{subItem.title}</span>
                  {subItem.badge && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                      {subItem.badge}
                    </span>
                  )}
                </div>
                {subItem.description && (
                  <p className="text-sm leading-snug text-slate-500 mt-0.5">
                    {subItem.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <Link
      key={item.title}
      href={item.url}
      className="block py-2 font-semibold text-slate-800"
      onClick={onClose}
    >
      {item.title}
    </Link>
  );
};

export { Navbar1 };
