"use client";

import { UserButton } from "@clerk/nextjs";
import { ScanTextIcon, StarsIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import AI Code ReviewLogo from "@/components/shared/ai-code-review-logo";
import AppMenuItem from "./app-menu-item";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: StarsIcon,
  },
  {
    title: "Analysis",
    url: "/analysis",
    icon: ScanTextIcon,
  },
];

const AppSidebar = () => {
  return (
    <aside className="fixed inset-y-0 z-10 flex flex-col h-svh border-r bg-sidebar w-[3rem]">
      <Link href={"/dashboard"} className="p-2">
        <Button className="rounded-full bg-foreground size-8 flex items-center justify-center cursor-pointer hover:bg-foreground">
          <AI Code ReviewLogo className="size-5" />
        </Button>
      </Link>

      <div className="flex flex-col gap-2 min-h-0 flex-1">
        {items.map((item) => (
          <AppMenuItem key={item.title} item={item} />
        ))}
      </div>

      <div className="p-2">
        <UserButton />
      </div>
    </aside>
  );
};

export default AppSidebar;
