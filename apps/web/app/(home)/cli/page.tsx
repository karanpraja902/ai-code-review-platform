import { Metadata } from "next";
import CliClient from "./cli-client";

export const metadata: Metadata = {
  title: "AI Code Review CLI | AI Code Reviews in Terminal",
  description:
    "AI code reviews in terminal, VS Code, Cursor, and more. Catch defects before they hit your PR. Install with npm i -g @karanpraja902/ai-code-review.",
  openGraph: {
    title: "AI Code Review CLI | AI Code Reviews in Terminal",
    description:
      "AI code reviews in terminal, VS Code, Cursor, and more. Catch defects before they hit your PR. Install with npm i -g @karanpraja902/ai-code-review.",
    images: [
      {
        url: "/cli_landing.png",
        width: 1200,
        height: 630,
        alt: "AI Code Review CLI",
      },
    ],
  },
};

export default function CliPage() {
  return <CliClient />;
}