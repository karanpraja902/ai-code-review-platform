import { Metadata } from "next";
import CliClient from "./cli-client";

export const metadata: Metadata = {
  title: "AI Code Review CLI | AI Code Reviews in Terminal",
  description:
    "AI code reviews in terminal, VS Code, Cursor, and more. Catch defects before they hit your PR. Install with npm i -g @ai-code-reviewai_dev/ai-code-review.",
  openGraph: {
    title: "AI Code Review CLI | AI Code Reviews in Terminal",
    description:
      "AI code reviews in terminal, VS Code, Cursor, and more. Catch defects before they hit your PR. Install with npm i -g @ai-code-reviewai_dev/ai-code-review.",
  },
};

export default function CliPage() {
  return <CliClient />;
}