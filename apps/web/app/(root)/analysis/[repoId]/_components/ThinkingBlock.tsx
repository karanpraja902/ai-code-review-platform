"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ThinkingBlockProps {
  content: string;
  className?: string;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ 
  content, 
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("w-full my-4", className)}>
      {/* Thinking Header */}
      <div
        onClick={toggleExpanded}
        className="justify-start h-auto cursor-pointer transition-all duration-200"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span className="text-sm font-medium">Reasoned</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 ml-auto" />
          ) : (
            <ChevronRight className="h-4 w-4 ml-auto" />
          )}
        </div>
      </div>

      {/* Thinking Content */}
      {isExpanded && (
        <div className="mt-2">
          <div className="text-sm text-muted-foreground leading-relaxed">
            <Markdown
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      language={match[1]}
                      style={vscDarkPlus}
                      className="text-xs"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      {...rest}
                      className={cn(
                        "px-1.5 py-0.5 bg-muted rounded text-xs font-mono",
                        className
                      )}
                    >
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-sm">{children}</li>
                ),
                h1: ({ children }) => (
                  <h1 className="text-base font-semibold mb-2 mt-4 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-medium mb-1 mt-2 first:mt-0">{children}</h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic mb-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;