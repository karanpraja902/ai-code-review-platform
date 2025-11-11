"use client";

import React from "react";
import { OrganizationProfile } from "@clerk/nextjs";

export default function OrganizationProfilePage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <OrganizationProfile />
    </div>
  );
}