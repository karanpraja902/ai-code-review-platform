"use client";

import NavbarWeb from "../_components/ui/navbarWeb";
import FooterSection from "../_components/ui/footer";
import ParallaxAI Code Review from "../_components/ui/parallax-ai-code-review";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function CliPage() {
  const [copied, setCopied] = useState(false);
  const command = "npm i -g @ai-code-reviewai_dev/ai-code-review";

  const handleCopy = async () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#010010] text-white selection:bg-primary/30">
      <NavbarWeb hasAnnouncement={false} />
      
      {/* Hero Section Container - Consistent with Security/Interact pages */}
      <div className="relative border-b border-[#333333]">
        <div className="relative mx-auto max-w-[1563px] border-[#333333] px-6 pb-60 md:border-r md:border-l md:px-14 md:pt-48 md:pb-[30rem] flex flex-col items-center justify-center overflow-hidden min-h-[70vh]">
          
          {/* Exact Grid Background from Image */}
          <div 
            className="absolute inset-0 z-0 opacity-[0.15]" 
            style={{ 
              backgroundImage: `
                linear-gradient(to right, var(--primary) 1px, transparent 1px),
                linear-gradient(to bottom, var(--primary) 1px, transparent 1px)
              `,
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 60%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 60%)'
            }}
          />
          
          {/* Subtle Central Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-[16/9] bg-primary/10 rounded-full blur-[120px] z-0 pointer-events-none opacity-40"></div>

          <div className="relative z-10 w-full text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold mb-8 tracking-tight leading-none text-white font-scandia">
                Review your Code, <br /> now in CLI
              </h1>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mb-14 max-w-3xl"
            >
              <p className="text-sm md:text-base text-white/40 leading-relaxed uppercase tracking-[0.08em] font-medium">
                AI code reviews in terminal, VS Code, Cursor, and <br className="hidden md:block" />
                Antigravity and more. Catch defects before they hit your PR.
              </p>
            </motion.div>
            
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full max-w-xl group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
              onClick={handleCopy}
              type="button"
            >
              <div className="relative flex items-center bg-[#050510] border border-primary/30 rounded-sm px-6 py-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all group-hover:border-primary/60">
                <div className="flex-shrink-0 mr-4">
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                      >
                        <Check className="w-5 h-5 text-primary" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                      >
                        <Copy className="w-5 h-5 text-primary/60" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <code className="text-white/80 text-sm md:text-base flex-1 text-left truncate tracking-tight font-geist-mono">
                  {command}
                </code>
                <span className="ml-4 text-[10px] uppercase font-bold tracking-widest text-white/20 group-hover:text-primary transition-colors">
                  {copied ? "Copied" : "Copy"}
                </span>
              </div>
            </motion.button>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-10 text-[11px] md:text-xs text-white/20 tracking-[0.1em] uppercase font-bold"
            >
              Supported in MacOS, Linux, and Windows
            </motion.div>
          </div>
        </div>
      </div>
      
      <FooterSection />
      <ParallaxAI Code Review />
    </main>
  );
}