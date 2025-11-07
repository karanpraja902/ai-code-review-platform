import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import QueryProviders from "@/components/query-providers";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      appearance={{
        cssLayerName: "clerk",
      }}
      localization={{
        formFieldLabel__username: "GitHub Username",
        formFieldInputPlaceholder__username: "Enter your GitHub username",
      }}>
      <ThemeProvider
        enableSystem
        attribute={"class"}
        defaultTheme="dark"
        disableTransitionOnChange>
        <QueryProviders>{children}</QueryProviders>
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default Providers;
