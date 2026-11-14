import { useState, useEffect, useRef } from "react";
import { ChevronUp } from "lucide-react";
import { Icon } from "@iconify/react";
import { useLocation } from "react-router-dom";

const WHATSAPP_NUMBER = "2348029606405";
const DEFAULT_WA_MESSAGE = "Hello Tutorial Center! I would like to make an inquiry.";

export default function StickyButtons() {
  const location = useLocation();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const longPressTimer = useRef(null);

  // Hide buttons on classroom and exam screens
  const hideOnKeywords = ["classroom", "exam"];
  const shouldHide = hideOnKeywords.some(keyword => 
    location.pathname.toLowerCase().includes(keyword)
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 80;
      setIsScrolled(scrolled);
      // Show scroll-to-top button once user scrolls past 400px
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsChatDisabled(true);
    }, 1200);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleOpenWhatsApp = (e) => {
    e.preventDefault();
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_WA_MESSAGE)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const containerGlassClass = isScrolled
    ? "bg-white/90 dark:bg-[#09314F]/90 backdrop-blur-md border-emerald-500/30 dark:border-emerald-500/20 shadow-lg"
    : "bg-[#09314F] dark:bg-[#09314F] border-emerald-500/20 shadow-md";

  if (shouldHide) return null;

  return (
    <div 
      className="fixed bottom-20 sm:bottom-7 right-3.5 sm:right-6 z-[60] flex flex-col items-center gap-2.5 pointer-events-auto select-none"
      aria-label="Floating Shortcuts"
    >
      {/* Back To Top (Icon Only) */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#BB9E7F] hover:bg-[#a88c6e] active:scale-95 text-white flex items-center justify-center shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
          title="Back to Top"
          aria-label="Back to Top"
        >
          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* CHAT WITH US (WhatsApp Quick Action) */}
      {!isChatDisabled && (
        <button 
          onClick={handleOpenWhatsApp}
          onDoubleClick={() => setIsChatDisabled(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#25D366] to-[#128C7E] hover:from-[#22bf5b] hover:to-[#0f7a6e] active:scale-95 text-white flex items-center justify-center shadow-xl hover:-translate-y-0.5 transition-all duration-300 border-2 border-white/30 dark:border-white/20 group ring-4 ring-emerald-500/20 ${containerGlassClass}`}
          title="Chat with us on WhatsApp (Double-click to hide)"
          aria-label="Chat with Tutorial Center on WhatsApp"
        >
          {/* Subtle online pulse ping */}
          <span className="absolute top-0 right-0 -mt-0.5 -mr-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white"></span>
          </span>

          <Icon 
            icon="logos:whatsapp-icon" 
            className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform drop-shadow" 
          />

          {/* Tooltip on desktop hover */}
          <span className="hidden sm:group-hover:block absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-gray-900/90 text-white text-xs font-semibold whitespace-nowrap shadow-md backdrop-blur-xs pointer-events-none">
            Chat on WhatsApp
          </span>
        </button>
      )}
    </div>
  );
}
