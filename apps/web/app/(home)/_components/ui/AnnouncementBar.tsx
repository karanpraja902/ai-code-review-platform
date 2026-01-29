"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

const AnnouncementBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 backdrop-blur-md border-b border-white/10 overflow-hidden">
      <motion.div 
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="max-w-[1563px] mx-auto px-4 h-10 flex items-center justify-center"
      >
        <Link 
          href="/cli"
          className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white/90 hover:text-white transition-colors group"
        >
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider">
            New
          </span>
          <span>We have launched ai-code-review cli</span>
          <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </Link>
      </motion.div>
    </div>
  );
};

export default AnnouncementBar;
