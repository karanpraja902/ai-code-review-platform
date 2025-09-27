import Link from "next/link";
import ParallaxAI Code Review from "./parallax-ai-code-review";

const links = [
  {
    title: "Pricing",
    href: "/pricing",
  },
];

export default function FooterSection() {
  return (
    <footer className="px-5 relative mb-96">
      <div className="mx-auto max-w-[1563px] w-full md:p-14 p-6 border border-t-0 border-b-0 border-[#333333]">
        <div className="flex flex-wrap justify-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-neutral-400 text-sm hover:text-neutral-200 transition-colors duration-300"
            >
              {link.title}
            </Link>
          ))}
          <span className="text-neutral-400 order-last block text-center text-sm md:order-first">
            © {new Date().getFullYear()} AI CODE REVIEW, All rights reserved
          </span>
        </div>
      </div>
    
    </footer>
  );
}
