"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Image from "next/image";

interface Testimonial {
  id: number;
  quote: string;
  name: string;
  username: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote:
      "The predictive AI insights enabled our clinical team to identify cardiac markers days in advance. Highly recommend zorabihealth!",
    name: "Dr. Sarah Jenkins",
    username: "Chief Medical Officer",
    avatar: "/images/doctor1.jpg",
  },
  {
    id: 2,
    quote:
      "zorabihealth integrated seamlessly into our clinic's workflow. We've seen a 30% increase in outpatient care efficiency.",
    name: "Dr. David Vance",
    username: "Cardiologist",
    avatar: "/images/doctor2.jpg",
  },
  {
    id: 3,
    quote:
      "As a data analyst, generating predictive health reports without needing a complex ML backend is a total game-changer.",
    name: "Elena Rostova",
    username: "Healthcare Data Analyst",
    avatar: "/images/researcher.jpg",
  },
  {
    id: 4,
    quote:
      "Our patient satisfaction scores improved significantly after launching zorabihealth's personalized tracking widgets.",
    name: "Marcus Thorne",
    username: "Clinical Operations Director",
    avatar: "/images/doctor3.jpg",
  },
  {
    id: 5,
    quote:
      "The accuracy of the indicators analysis tools gave us the exact data we needed for our lung and heart research projects.",
    name: "Dr. Amira Patel",
    username: "Clinical Researcher",
    avatar: "/images/doctor4.jpg",
  },
];

const getVisibleCount = (width: number): number => {
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
};

const TestimonialSlider: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(1024);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    setWindowWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const oldVisibleCount = getVisibleCount(windowWidth);
      const newVisibleCount = getVisibleCount(newWidth);

      setWindowWidth(newWidth);

      if (oldVisibleCount !== newVisibleCount) {
        const maxIndexForNewWidth = testimonials.length - newVisibleCount;
        if (currentIndex > maxIndexForNewWidth) {
          setCurrentIndex(Math.max(0, maxIndexForNewWidth));
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted, windowWidth, currentIndex]);

  useEffect(() => {
    if (!mounted || !isAutoPlaying) return;

    const startAutoPlay = () => {
      autoPlayRef.current = setInterval(() => {
        const visibleCount = getVisibleCount(windowWidth);
        const maxIndex = testimonials.length - visibleCount;

        if (currentIndex >= maxIndex) {
          setDirection(-1);
          setCurrentIndex((prev) => prev - 1);
        } else if (currentIndex <= 0) {
          setDirection(1);
          setCurrentIndex((prev) => prev + 1);
        } else {
          setCurrentIndex((prev) => prev + direction);
        }
      }, 4000);
    };

    startAutoPlay();

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [mounted, isAutoPlaying, currentIndex, windowWidth, direction]);

  const visibleCount = getVisibleCount(windowWidth);
  const maxIndex = testimonials.length - visibleCount;
  const canGoNext = currentIndex < maxIndex;
  const canGoPrev = currentIndex > 0;

  const goNext = () => {
    if (canGoNext) {
      setDirection(1);
      setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
      pauseAutoPlay();
    }
  };

  const goPrev = () => {
    if (canGoPrev) {
      setDirection(-1);
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
      pauseAutoPlay();
    }
  };

  const pauseAutoPlay = () => {
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 8000);
  };

  const handleDragEnd = (event: any, info: any) => {
    const { offset } = info;
    const swipeThreshold = 30;

    if (offset.x < -swipeThreshold && canGoNext) {
      goNext();
    } else if (offset.x > swipeThreshold && canGoPrev) {
      goPrev();
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    pauseAutoPlay();
  };

  // Safe SSR/Hydration rendering:
  // Render a static, clean 3-column layout on the server and during initial client load.
  // Switch to the dynamic interactive slider after the component has mounted.
  if (!mounted) {
    return (
      <div className="px-4 py-8 sm:py-16 bg-slate-50 dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 overflow-hidden animate-on-scroll">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium text-xs sm:text-sm uppercase tracking-wider">
              Testimonials
            </span>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-700 to-brand-500 dark:from-brand-400 dark:to-brand-600 bg-clip-text text-transparent mt-3 sm:mt-4 px-4">
              Transformative Care & Partner Experiences
            </h3>
            <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-brand-700 to-brand-500 dark:from-brand-400 dark:to-brand-600 mx-auto mt-4 sm:mt-6"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial) => (
              <div
                key={testimonial.id}
                className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-white border border-slate-100 shadow-md shadow-brand-500/5"
              >
                <div className="absolute -top-4 -left-4 opacity-5 pointer-events-none">
                  <Quote size={60} className="text-brand-900" />
                </div>
                <div className="relative z-10 h-full flex flex-col">
                  <p className="text-sm sm:text-base text-slate-600 font-medium mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-200 relative overflow-hidden">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-3">
                        <h4 className="font-bold text-sm sm:text-base text-slate-800 leading-tight">
                          {testimonial.name}
                        </h4>
                        <p className="text-slate-500 text-xs sm:text-sm">{testimonial.username}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:py-16 bg-slate-50 dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 overflow-hidden animate-on-scroll">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <span className="inline-block py-1 px-3 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium text-xs sm:text-sm uppercase tracking-wider">
            Testimonials
          </span>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-700 to-brand-500 dark:from-brand-400 dark:to-brand-600 bg-clip-text text-transparent mt-3 sm:mt-4 px-4">
            Transformative Care & Partner Experiences
          </h3>
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-brand-700 to-brand-500 dark:from-brand-400 dark:to-brand-600 mx-auto mt-4 sm:mt-6"></div>
        </motion.div>

        <div className="relative" ref={containerRef}>
          <div className="flex justify-center sm:justify-end sm:absolute sm:-top-16 right-0 space-x-2 mb-4 sm:mb-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goPrev}
              disabled={!canGoPrev}
              className={`p-2 rounded-full border ${
                canGoPrev
                  ? "bg-white border-slate-200 dark:bg-gray-700 dark:border-gray-600 shadow-sm hover:bg-slate-50 dark:hover:bg-gray-600 text-brand-600 dark:text-brand-400"
                  : "bg-gray-100 border-transparent dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              } transition-all duration-300`}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goNext}
              disabled={!canGoNext}
              className={`p-2 rounded-full border ${
                canGoNext
                  ? "bg-white border-slate-200 dark:bg-gray-700 dark:border-gray-600 shadow-sm hover:bg-slate-50 dark:hover:bg-gray-600 text-brand-600 dark:text-brand-400"
                  : "bg-gray-100 border-transparent dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              } transition-all duration-300`}
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </div>

          <div className="overflow-hidden relative px-2 sm:px-0">
            <motion.div
              className="flex"
              animate={{ x: `-${currentIndex * (100 / visibleCount)}%` }}
              transition={{
                type: "spring",
                stiffness: 70,
                damping: 20,
              }}
            >
              {testimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.id}
                  className={`flex-shrink-0 w-full ${
                    visibleCount === 3 ? "md:w-1/3" : visibleCount === 2 ? "md:w-1/2" : "w-full"
                  } p-3`}
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98, cursor: "grabbing" }}
                  style={{ cursor: "grab" }}
                >
                  <motion.div
                    className="relative overflow-hidden rounded-2xl p-6 sm:p-8 h-full bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 shadow-md shadow-brand-500/5"
                    whileHover={{
                      boxShadow:
                        "0 10px 15px -3px rgba(14, 165, 233, 0.08), 0 4px 6px -2px rgba(14, 165, 233, 0.03)",
                    }}
                  >
                    <div className="absolute -top-4 -left-4 opacity-5 dark:opacity-10 pointer-events-none">
                      <Quote
                        size={windowWidth < 640 ? 40 : 60}
                        className="text-brand-900 dark:text-brand-400"
                      />
                    </div>

                    <div className="relative z-10 h-full flex flex-col">
                      <p className="text-sm sm:text-base text-slate-600 dark:text-gray-300 font-medium mb-6 leading-relaxed">
                        &ldquo;{testimonial.quote}&rdquo;
                      </p>

                      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-gray-700">
                        <div className="flex items-center">
                          <div className="relative flex-shrink-0">
                            <Image
                              width={48}
                              height={48}
                              src={testimonial.avatar}
                              alt={testimonial.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                            />
                            <motion.div
                              className="absolute inset-0 rounded-full bg-brand-500/20"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0, 0.3, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 1,
                              }}
                            />
                          </div>
                          <div className="ml-3">
                            <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white leading-tight">
                              {testimonial.name}
                            </h4>
                            <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm">
                              {testimonial.username}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="flex justify-center mt-6 sm:mt-8">
            {Array.from(
              { length: testimonials.length - visibleCount + 1 },
              (_: unknown, index: number) => (
                <motion.button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className="relative mx-1 focus:outline-none"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`Go to testimonial ${index + 1}`}
                >
                  <motion.div
                    className={`w-2 h-2 rounded-full ${
                      index === currentIndex
                        ? "bg-brand-600 dark:bg-brand-400"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    animate={{
                      scale: index === currentIndex ? [1, 1.2, 1] : 1,
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: index === currentIndex ? Infinity : 0,
                      repeatDelay: 1,
                    }}
                  />
                  {index === currentIndex && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-brand-500/30"
                      animate={{
                        scale: [1, 1.8],
                        opacity: [1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                    />
                  )}
                </motion.button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialSlider;
