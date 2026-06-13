"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const projects = [
  {
    title: "Guided Breathwork",
    src: "/images/a1.jpg",
    gradient: "from-[#0f172a] via-[#0891b2] to-[#1e1b4b]",
  },
  {
    title: "Mindfulness Practice",
    src: "/images/a2.avif",
    gradient: "from-[#1c1c1c] via-[#2d2d2d] to-[#111111]",
  },
  {
    title: "Deep Relaxation",
    src: "/images/a3.jpg",
    gradient: "from-blue-600 via-indigo-950 to-indigo-900",
  },
  {
    title: "Focused Awareness",
    src: "/images/a4.jpg",
    gradient: "from-cyan-950 via-slate-900 to-blue-900",
  },
  {
    title: "Tranquil Mind",
    src: "/images/a5.jpg",
    gradient: "from-slate-900 via-purple-900 to-indigo-950",
  },
];

const StickyCard_001 = ({
  i,
  title,
  src,
  progress,
  range,
  targetScale,
  gradient,
}: {
  i: number;
  title: string;
  src: string;
  progress: any;
  range: [number, number];
  targetScale: number;
  gradient: string;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <motion.div
      ref={container}
      style={{
        scale,
        top: `calc(10vh + ${i * 32}px)`,
      }}
      className={`rounded-3xl sm:rounded-[36px] relative flex origin-top flex-col overflow-hidden shadow-2xl border border-white/20
                 bg-gradient-to-tr ${gradient}
                 w-[92vw] sm:w-[88vw] md:w-[84vw] lg:w-[80vw] max-w-[1200px]
                 h-[55vh] sm:h-[60vh] md:h-[65vh] lg:h-[70vh] max-h-[700px]`}
    >
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          className="object-cover opacity-95 hover:opacity-100 transition-opacity duration-300"
          sizes="(max-width: 768px) 92vw, 80vw"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}

      {/* Card Title HUD Overlay */}
      <div className="absolute bottom-6 left-6 z-10 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl text-white">
        <p className="text-[9px] uppercase tracking-widest font-black text-cyan-300">
          Screen {i + 1}
        </p>
        <h4 className="text-xs font-bold font-hanken tracking-tight">{title}</h4>
      </div>
    </motion.div>
  );
};

const ScrollingAnimationInner = ({ scrollContainer }: { scrollContainer: HTMLElement }) => {
  const container = useRef<HTMLDivElement>(null);
  const containerRefForScroll = useRef<HTMLElement>(scrollContainer);

  const { scrollYProgress } = useScroll({
    target: container,
    container: containerRefForScroll,
    offset: ["start start", "end end"],
  });

  return (
    <div
      ref={container}
      className="relative flex w-full flex-col items-center justify-center pb-[10vh]"
    >
      {projects.map((project, i) => {
        const targetScale = Math.max(0.6, 1 - (projects.length - i - 1) * 0.08);
        return (
          <div
            key={`p_container_${i}`}
            className="sticky top-0 h-screen w-full flex items-start justify-center z-10"
          >
            <StickyCard_001
              i={i}
              {...project}
              progress={scrollYProgress}
              range={[i * 0.25, 1]}
              targetScale={targetScale}
            />
          </div>
        );
      })}
    </div>
  );
};

const ImagesScrollingAnimation = () => {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const main = document.getElementById("dashboard-main") || document.querySelector("main");
      if (main) {
        setScrollContainer(main);
      }
    });
  }, []);

  if (!scrollContainer) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-slate-400 text-xs font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          Synchronizing scroll triggers...
        </div>
      </div>
    );
  }

  return <ScrollingAnimationInner scrollContainer={scrollContainer} />;
};

export { ImagesScrollingAnimation, StickyCard_001 };
