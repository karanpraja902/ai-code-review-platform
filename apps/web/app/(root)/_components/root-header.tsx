"use client";

import React from "react";
import ThemeToggle from "@/components/shared/theme-toggle";
import { UserButton } from "@clerk/nextjs";

const RootHeader = () => {
  return (
    <div className="px-4 py-1 border-b flex items-center justify-between">
      {/* Left side placeholder (can hold page title later) */}
      <div className="" />

      {/* Right side: bulb (theme toggle) and user avatar */}
      <div className="flex items-center gap-2">
        <ThemeToggle className="hover:bg-transparent" />
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "w-6 h-6",
              userButtonTrigger: "p-0",
            },
          }}
        />
      </div>
    </div>
  );
};

export default RootHeader;