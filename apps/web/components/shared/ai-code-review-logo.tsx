import { cn } from "@/lib/utils";
import Image from "next/image";
import React from "react";

const AiCodeReviewLogo = ({ className }: { className?: string }) => {
  return (
    <Image
      src="/ai-code-review.png"
      alt="Codebear logo"
      width={32}
      height={32}
      className={`${className}`}
      priority
    />
  );
};

export default AiCodeReviewLogo;
