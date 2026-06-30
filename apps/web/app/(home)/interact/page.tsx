import React from "react";
import FooterSection from "../_components/ui/footer";
import NavbarWeb from "../_components/ui/navbarWeb";
import ParallaxAiCodeReview from "../_components/ui/parallax-ai-code-review";
import HowToInteractCard from "../../(root)/dashboard/_components/HowToInteractCard";

export default function InteractPage() {
  return (
    <main className="min-h-screen bg-[#010010] text-white">
      <NavbarWeb />

      <div className="relative border-b border-[#333333]">
        <div className="relative mx-auto max-w-[1563px] border-[#333333] p-6 md:border-r md:border-l md:p-14">
          {/* Dark White Dotted Grid Background */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: "#000000",
              backgroundImage: `
              radial-gradient(circle, rgba(255, 255, 255, 0.1) 1.5px, transparent 1.5px)
            `,
              backgroundSize: "25px 25px",
              backgroundPosition: "0 0",
            }}
          />
          <div className="relative z-10 py-12 md:py-20">
            <h1 className="mb-6 text-4xl font-medium md:text-6xl">
              Interact with AI Code Review
            </h1>
            <p className="max-w-2xl text-xl text-zinc-400">
              Learn how to use AI Code Review and get the most out of your code reviews.
              From installation to advanced commands.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1563px] border-[#333333] md:border-r md:border-l">
        <div className="flex flex-col lg:flex-row">
          {/* Main Content - Full width since we don't have a TOC for now */}
          <div className="p-6 md:p-14 w-full">
            <div className="prose prose-invert max-w-none">
              <HowToInteractCard />
            </div>
          </div>
        </div>
      </div>

      <FooterSection />
      <ParallaxAiCodeReview />
    </main>
  );
}
