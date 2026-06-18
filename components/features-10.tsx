import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Brain, TrendingUp } from "lucide-react";
import { ReactNode } from "react";

export function Features() {
  return (
    <section className="bg-zinc-50 py-16 md:py-32 dark:bg-transparent animate-on-scroll">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium text-xs sm:text-sm uppercase tracking-wider">
            Platform Features
          </span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-brand-900 to-brand-500 bg-clip-text text-transparent mt-3 sm:mt-4 px-4 uppercase">
            AI-Powered Health Intelligence
          </h3>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-brand-700 to-brand-500 mx-auto mt-4 sm:mt-6"></div>
        </div>

        <div className="mx-auto grid gap-6 lg:grid-cols-2 max-w-5xl">
          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={Brain}
                title="AI Health Assistant"
                description="Clinical GenAI Insights"
                text="Advanced clinical algorithms analyze patient indicators and generate predictive wellness management suggestions instantly."
              />
            </CardHeader>

            <div className="relative mb-6 border-t border-dashed border-slate-100 sm:mb-0">
              <div className="absolute inset-0 [background:radial-gradient(125%_125%_at_50%_0%,transparent_40%,hsl(var(--muted)),white_125%)]"></div>
              <div className="aspect-[76/59] p-1 px-6">
                <DualModeImage
                  darkSrc="/images/features/payments.png"
                  lightSrc="/images/features/payments-light.png"
                  alt="ai health insights"
                  width={1207}
                  height={929}
                />
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={TrendingUp}
                title="Smart Predictive Analytics"
                description="Interactive Indicators Analysis"
                text="Comprehensive health tracking maps trends dynamically with real-time vitals representation and predictive modeling."
              />
            </CardHeader>

            <CardContent>
              <div className="relative mb-6 sm:mb-0">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover rounded-2xl opacity-40"
                >
                  <source src="/video/secondbox.mp4" type="video/mp4" />
                </video>
                <div className="aspect-[76/59] border border-slate-100 relative z-10">
                  <DualModeImage
                    darkSrc="/images/features/origin-cal-dark.png"
                    lightSrc="/images/features/origin-cal.png"
                    alt="predictive trends"
                    width={1207}
                    height={929}
                  />
                </div>
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard className="p-8 lg:col-span-2">
            <p className="mx-auto my-6 max-w-2xl text-balance text-center text-2xl font-bold text-slate-800">
              zorabihealth integrates clinical security with real-time multi-device synchronization
              and zero-knowledge data protection.
            </p>

            <div className="flex justify-center gap-6 overflow-hidden mt-8">
              <CircularUI
                label="Security Shield"
                circles={[{ pattern: "border" }, { pattern: "border" }]}
              />

              <CircularUI
                label="Zero-Knowledge"
                circles={[{ pattern: "none" }, { pattern: "primary" }]}
              />

              <CircularUI
                label="Sync Engine"
                circles={[{ pattern: "blue" }, { pattern: "none" }]}
              />

              <CircularUI
                label="Indicators Analysis"
                circles={[{ pattern: "primary" }, { pattern: "none" }]}
                className="hidden sm:block"
              />
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  children: ReactNode;
  className?: string;
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
  <Card
    className={cn(
      "group relative rounded-[2rem] border border-slate-100 shadow-md bg-white shadow-brand-500/5",
      className
    )}
  >
    <CardDecorator />
    {children}
  </Card>
);

const CardDecorator = () => (
  <>
    <span className="border-brand-500 absolute -left-px -top-px block size-3 border-l-2 border-t-2"></span>
    <span className="border-brand-500 absolute -right-px -top-px block size-3 border-r-2 border-t-2"></span>
    <span className="border-brand-500 absolute -bottom-px -left-px block size-3 border-b-2 border-l-2"></span>
    <span className="border-brand-500 absolute -bottom-px -right-px block size-3 border-b-2 border-r-2"></span>
  </>
);

interface CardHeadingProps {
  icon: React.ElementType;
  title: string;
  description: string;
  text: string;
}

const CardHeading = ({ icon: Icon, title, description, text }: CardHeadingProps) => (
  <div className="p-6">
    <span className="text-brand-600 font-semibold flex items-center gap-2 text-sm uppercase tracking-wide">
      <Icon className="size-5" />
      {title}
    </span>
    <p className="mt-4 text-2xl font-bold text-slate-800">{description}</p>
    <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">{text}</p>
  </div>
);

interface DualModeImageProps {
  darkSrc: string;
  lightSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

const DualModeImage = ({
  darkSrc,
  lightSrc,
  alt,
  width,
  height,
  className,
}: DualModeImageProps) => (
  <>
    <Image
      src={darkSrc}
      className={cn("hidden dark:block object-contain w-full h-full", className)}
      alt={`${alt} dark`}
      width={width}
      height={height}
      loading="eager"
    />
    <Image
      src={lightSrc}
      className={cn("shadow dark:hidden object-contain w-full h-full", className)}
      alt={`${alt} light`}
      width={width}
      height={height}
      loading="eager"
    />
  </>
);

interface CircleConfig {
  pattern: "none" | "border" | "primary" | "blue";
}

interface CircularUIProps {
  label: string;
  circles: CircleConfig[];
  className?: string;
}

const CircularUI = ({ label, circles, className }: CircularUIProps) => (
  <div className={className}>
    <div className="bg-gradient-to-b from-brand-100 size-fit rounded-2xl to-transparent p-px">
      <div className="bg-gradient-to-b from-background to-brand-50/20 relative flex aspect-square w-fit items-center -space-x-4 rounded-[15px] p-4">
        {circles.map((circle, i) => (
          <div
            key={i}
            className={cn("size-7 rounded-full border sm:size-8", {
              "border-brand-500": circle.pattern === "none",
              "border-brand-500 bg-[repeating-linear-gradient(-45deg,rgba(0,119,182,0.1),rgba(0,119,182,0.1)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "border",
              "border-brand-500 bg-background bg-[repeating-linear-gradient(-45deg,rgba(0,119,182,0.3),rgba(0,119,182,0.3)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "primary",
              "bg-background z-1 border-brand-400 bg-[repeating-linear-gradient(-45deg,rgba(56,189,248,0.3),rgba(56,189,248,0.3)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "blue",
            })}
          ></div>
        ))}
      </div>
    </div>
    <span className="text-slate-600 font-semibold mt-1.5 block text-center text-xs">{label}</span>
  </div>
);
