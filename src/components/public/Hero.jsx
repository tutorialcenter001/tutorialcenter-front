import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logo1 from "../../assets/images/TC 1.webp";
import slide1 from "../../assets/images/Study_that_stays (2).webp";
import slide2 from "../../assets/images/Hero_mobile.webp";
import ScrollReveal from "./ScrollReveal";
import OptimizedImage from "../common/OptimizedImage";

const slides = [slide1, slide2];

export default function Hero() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const heroRef = useRef(null);
    const [isHeroVisible, setIsHeroVisible] = useState(true);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsHeroVisible(entry.isIntersecting);
            },
            { threshold: 0.05 }
        );

        if (heroRef.current) {
            observer.observe(heroRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isHeroVisible) return; // Pause slideshow when user scrolls past Hero

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [isHeroVisible]);

    return (
        <div ref={heroRef} style={{ overflowAnchor: "none" }}>
            <div className="bg-primary py-2 text-center block max-sm:hidden">
                <p className="text-white text-sm">
                    Click here to join our students in archiving excellence...{" "}
                    <Link to="/register" className="text-ascent font-bold">
                        Apply Now
                    </Link>
                </p>
            </div>

            {/* Hero Section for laptop and above */}
            <div className="relative pt-16 pb-20 bg-white max-lg:hidden overflow-hidden" style={{ overflowAnchor: "none" }}>
                <div className="Container relative z-10 w-full flex items-center justify-between gap-12">
                    
                    {/* Left Column: Text Content */}
                    <div className="max-w-[550px] flex flex-col items-start text-left">
                        <ScrollReveal delay={0.2} direction="up" distance={30}>
                            <h1 className="font-bold text-[52px] mb-4 uppercase leading-[1.1] tracking-tight">
                                <span className="text-[#BB9E7F]">Ace</span> <span className="text-[#09314F]">Your</span> <span className="text-[#BB9E7F]">Exams</span>,<br />
                                <span className="text-[#09314F]">Secure Your Future!</span>
                            </h1>
                        </ScrollReveal>
                        
                        <ScrollReveal delay={0.4} direction="up" distance={30}>
                            <p className="text-lg font-semibold leading-relaxed mb-10 text-[#09314F]">
                                Everything you need to pass <span className="text-[#BB9E7F]">WAEC, NECO, JAMB</span> and <span className="text-[#BB9E7F]">GCE</span> all in one place.
                            </p>
                        </ScrollReveal>
                        
                        <ScrollReveal delay={0.6} direction="up" distance={20}>
                            <div className="flex items-center gap-4">
                                {/* Login Button */}
                                <div className="w-[236px] h-[56px] rounded-xl p-[2px] bg-gradient-to-r from-[#09314F] to-[#E83831] hover:shadow-md transition-all hover:-translate-y-0.5 shadow-sm">
                                    <Link
                                        to="/login"
                                        className="flex items-center justify-center bg-white rounded-[10px] w-full h-full"
                                    >
                                        <span className="bg-gradient-to-r from-[#09314F] to-[#E83831] bg-clip-text text-transparent font-bold">
                                            Login
                                        </span>
                                    </Link>
                                </div>
                                
                                {/* Apply Now Button */}
                                <Link
                                    to="/register"
                                    className="flex items-center justify-center w-[236px] h-[56px] bg-gradient-to-r from-[#09314F] to-[#E83831] text-white font-bold rounded-xl hover:opacity-90 transition-all hover:-translate-y-0.5 shadow-sm"
                                >
                                    Apply Now
                                </Link>
                            </div>
                        </ScrollReveal>
                    </div>

                    {/* Right Column: Slideshow & Floating Buttons */}
                    <div className="flex-1 relative">
                        <ScrollReveal delay={0.4} direction="left" distance={30}>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1 aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                                    {slides.map((slide, idx) => (
                                        <div
                                            key={idx}
                                            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                                                currentSlide === idx ? "translate-y-0 opacity-100 z-20" : "-translate-y-full opacity-0 z-10"
                                            }`}
                                        >
                                            <OptimizedImage 
                                                src={slide} 
                                                alt={`Slide ${idx + 1}`} 
                                                className="w-full h-full object-cover"
                                                containerClassName="w-full h-full"
                                                priority={idx === 0}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Slideshow Pagination Dots (Vertical OUTSIDE the Right Side) */}
                                <div className="flex flex-col items-center gap-2.5 bg-gray-100/90 dark:bg-gray-800/90 p-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                                    {slides.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentSlide(idx)}
                                            aria-label={`Go to slide ${idx + 1}`}
                                            className={`w-2.5 transition-all duration-300 rounded-full ${
                                                currentSlide === idx 
                                                    ? "h-7 bg-[#E83831] shadow-md scale-105" 
                                                    : "h-2.5 bg-[#BB9E7F]/40 hover:bg-[#BB9E7F]/80"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>

                </div>
            </div>

            {/* Hero Section for smaller screens (Mobile) */}
            <MobileHero currentSlide={currentSlide} />

            {/* Subsidiary Footer */}
            <div className="bg-ascent py-4 px-3">
                <div className="flex items-center justify-center gap-3">
                    <img
                        className="max-w-[75px] max-md:max-w-[50px]"
                        src={logo1}
                        alt="logo"
                    />
                    <p className="text-white font-semibold max-md:text-[12px]">
                        Tutorial Center is subsidiary of Roncloud Technologies
                    </p>
                </div>
            </div>
        </div>
    );
}

export const MobileHero = ({ currentSlide }) => {
    return (
        <div className="max-lg:block hidden w-full">
            <div className="relative w-full h-[550px]">
                {/* Background image slideshow with grey blend */}
                {slides.map((slide, idx) => (
                    <div
                        key={idx}
                        className={`w-full h-full absolute top-0 left-0 transition-all duration-1000 ease-in-out ${
                            currentSlide === idx ? "translate-y-0 opacity-100 z-10" : "-translate-y-full opacity-0 z-0"
                        }`}
                    >
                        <OptimizedImage 
                            src={slide} 
                            alt={`Mobile Slide ${idx + 1}`} 
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
                            priority={idx === 1}
                        />
                    </div>
                ))}

                {/* Overlay to ensure text readability */}
                <div className="bg-black/60 z-10 w-full h-full absolute top-0 left-0" />

                {/* Background content */}
                <div className="flex-1 absolute top-1/2 -translate-y-1/2 left-0 z-50 px-6 w-full">
                    <ScrollReveal delay={0.2} direction="up" distance={30}>
                        <h1 className="font-bold sm:text-[40px] text-3xl text-white mb-4 uppercase leading-[1.2]">
                            <span className="text-[#BB9E7F]">Ace</span> Your <br />
                            <span className="text-[#BB9E7F]">Exams</span>, Secure <br /> Your Future!
                        </h1>
                    </ScrollReveal>
                    
                    <ScrollReveal delay={0.4} direction="up" distance={30}>
                        <p className="text-base font-medium leading-relaxed mb-8 text-gray-200">
                            Everything you need to pass <span className="text-[#BB9E7F] font-semibold">WAEC, NECO, JAMB</span> and <span className="text-[#BB9E7F] font-semibold">GCE</span> all in one place.
                        </p>
                    </ScrollReveal>
                    
                    <ScrollReveal delay={0.6} direction="up" distance={20}>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            <div className="w-[236px] h-[56px] sm:flex-1 rounded-xl p-[2px] bg-gradient-to-r from-[#09314F] to-[#E83831] hover:shadow-md transition-all shadow-sm">
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center bg-white rounded-[10px] w-full h-full"
                                >
                                    <span className="bg-gradient-to-r from-[#09314F] to-[#E83831] bg-clip-text text-transparent font-bold">
                                        Login
                                    </span>
                                </Link>
                            </div>
                            <Link
                                to="/register"
                                className="w-[236px] h-[56px] sm:flex-1 flex items-center justify-center bg-gradient-to-r from-[#09314F] to-[#E83831] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all"
                            >
                                Apply Now
                            </Link>
                        </div>
                    </ScrollReveal>
                </div>

                {/* Mobile Vertical Slide Indicators */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-black/40 backdrop-blur-md px-1.5 py-2.5 rounded-full border border-white/20 shadow-md">
                    {slides.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-1.5 transition-all duration-300 rounded-full ${
                                currentSlide === idx ? "h-5 bg-[#E83831]" : "h-1.5 bg-white/60"
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
