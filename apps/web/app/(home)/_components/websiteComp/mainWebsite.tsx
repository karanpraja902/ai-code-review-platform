"use client";
import dynamic from "next/dynamic";
import NavbarWeb from "../ui/navbarWeb";
import AnnouncementBar from "../ui/AnnouncementBar";
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

const ParallaxAiCodeReview = dynamic(() => import("../ui/parallax-ai-code-review"), {
  ssr: false,
  loading: () => null,
});

const MainWebsite = () => {
  return (
    <main className="min-h-screen bg-[#010010] px-2 sm:px-5">
      {/* Navbar - Fixed at top */}
      <AnnouncementBar />
      <NavbarWeb hasAnnouncement={true} />
      <HeroSection />
      <OverviewSection />
      <FeaturesSection />
      <SecuritySection /> 
      <IntegratedModels />
      <FooterSection />
      <ParallaxAiCodeReview />
    </main>
  );
};

export default MainWebsite;
