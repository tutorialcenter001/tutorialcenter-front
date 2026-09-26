import React, { useState, useRef, useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { getBlogImageUrl } from "../../utils/imageUrl";
import handCup from "../../assets/images/handCup.webp";

export default function BlogSlideshow({
  images = [],
  alt = "Blog Image",
  className = "w-full h-full object-cover",
  containerClassName = "relative w-full h-48 sm:h-64 overflow-hidden bg-gray-100 dark:bg-gray-900 group",
  showControls = true,
  showDots = true,
  badge = null,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(null);

  // Normalize images to array of valid URLs
  const imageList = useMemo(() => {
    if (!images) return [];
    if (Array.isArray(images)) {
      return images.filter(Boolean);
    }
    if (typeof images === "string") {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {
        // Not JSON, treat as single URL
      }
      return [images];
    }
    return [];
  }, [images]);

  const hasMultiple = imageList.length > 1;

  const handlePrev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(idx);
  };

  const handleTouchStart = (e) => {
    if (!hasMultiple) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!hasMultiple || touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) {
      // Swiped left -> next
      handleNext(e);
    } else if (diff < -45) {
      // Swiped right -> prev
      handlePrev(e);
    }
    touchStartX.current = null;
  };

  const currentSrc = imageList.length > 0 ? getBlogImageUrl(imageList[currentIndex], handCup) : handCup;

  return (
    <div
      className={containerClassName}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Current Image */}
      <img
        src={currentSrc}
        alt={`${alt} ${hasMultiple ? `(${currentIndex + 1}/${imageList.length})` : ""}`}
        className={`${className} transition-opacity duration-500`}
        onError={(e) => {
          e.target.src = handCup;
        }}
        loading="lazy"
      />

      {/* Optional Top Badge (e.g. Category) */}
      {badge && <div className="absolute top-3 left-3 z-10">{badge}</div>}

      {/* Multi-image indicators & controls */}
      {hasMultiple && (
        <>
          {/* Slides Count Badge */}
          <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black flex items-center gap-1 border border-white/10 shadow-sm pointer-events-none">
            <PhotoIcon className="w-3 h-3 text-[#C5A97A]" />
            <span>
              {currentIndex + 1} / {imageList.length}
            </span>
          </div>

          {/* Prev / Next Arrows */}
          {showControls && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-md active:scale-95 border border-white/20"
              >
                <ChevronLeftIcon className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-md active:scale-95 border border-white/20"
              >
                <ChevronRightIcon className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {showDots && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              {imageList.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleDotClick(e, idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-4 bg-[#C5A97A] dark:bg-[#C5A97A]"
                      : "w-1.5 bg-white/60 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
