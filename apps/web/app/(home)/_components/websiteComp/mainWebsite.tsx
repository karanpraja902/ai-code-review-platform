"use client";
import dynamic from "next/dynamic";
import NavbarWeb from "../ui/navbarWeb";
import HeroSection from "./heroSection";

// Lazy load below-the-fold components to improve initial load time
const OverviewSection = dynamic(() => import("./OverviewSection"), {
  loading: () => <div className="min-h-[400px]" />,
});

const FeaturesSection = dynamic(() => import("./FeaturesSection"), {
  loading: () => <div className="min-h-[600px]" />,
});

const SecuritySection = dynamic(() => import("./SecuritySection"), {
  loading: () => <div className="min-h-[400px]" />,
});

const IntegratedModels = dynamic(() => import("./IntegratedModels"), {
  loading: () => <div className="min-h-[400px]" />,
});

const FooterSection = dynamic(() => import("../ui/footer"), {
  loading: () => <div className="min-h-[200px]" />,
});

const ParallaxAI Code Review = dynamic(() => import("../ui/parallax-ai-code-review"), {
  ssr: false,
  loading: () => null,
});

const MainWebsite = () => {
  return (
    <main className="min-h-screen bg-[#010010] px-2 sm:px-5">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      <OverviewSection />
      <FeaturesSection />
      <SecuritySection /> 
      <IntegratedModels />
      <FooterSection />
      <ParallaxAI Code Review />
    </main>
  );
};

export default MainWebsite;
