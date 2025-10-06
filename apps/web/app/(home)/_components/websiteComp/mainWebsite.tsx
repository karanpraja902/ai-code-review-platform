import FooterSection from "../ui/footer";
import NavbarWeb from "../ui/navbarWeb";
import ParallaxAI Code Review from "../ui/parallax-ai-code-review";
import FeaturesSection from "./FeaturesSection";
import HeroSection from "./heroSection";
import IntegratedModels from "./IntegratedModels";
import OverviewSection from "./OverviewSection";

const MainWebsite = () => {
  return (
    
    <main className="min-h-screen bg-[#010010] px-2 sm:px-5">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      <OverviewSection />
      <FeaturesSection />
      <IntegratedModels />
      <FooterSection />
      <ParallaxAI Code Review />
    </main>
  );
};

export default MainWebsite;
