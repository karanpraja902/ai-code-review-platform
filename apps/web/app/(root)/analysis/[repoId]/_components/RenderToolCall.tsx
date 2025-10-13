"use client";

import { detectLanguage, extractPath, parseToolCall } from "@/lib/utils";
// Accordion components removed as they are not used
import { LogItem } from "@/types/types";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BoxSelect, Eye, Import, SearchCode } from "lucide-react";
import React from "react";
import { RenderLLMSegments } from "./RenderLLMSegments";

export const RenderToolCall = ({ 
  log, 
  allLogs, 
  repoId, 
  analysisId, 
  isLoadedFromDb 
}: { 
  log: LogItem;
  allLogs?: LogItem[];
  repoId?: string;
  analysisId?: string;
  isLoadedFromDb?: boolean;
}) => {
  const { resolvedTheme } = useTheme();

  const result = parseToolCall(log.messages.join("\n"));
  // console.log(result?.type, result,"here is read file");

  if (result?.type === "READ_FILE") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        <span>
            {/* <Eye className="inline-block w-4 h-4 mr-1"/> {extractPath(result.result.file_path)} <span className="text-sm text-slate-500">{result.result.start_line ?? 0}-{result.result.end_line ?? 0}</span>  */}
        </span>
      </div>
    );
  }

  if (result?.type === "READ_FILE_RESULT") {
    const filePath = result.result.file_path;
    const normalizedFilePath = extractPath(filePath);

    // Filter logs for this specific file if allLogs is provided
    const getFileSpecificLogs = () => {
      if (!allLogs || !normalizedFilePath) return [];

      const fileContextGroups: { [filePath: string]: LogItem[] } = {};
      let currentFileContext: string | undefined = undefined;

      allLogs.forEach((logItem) => {
        // Check if this is a read_file tool call that starts a new file context
        if (logItem.type === "TOOL_CALL") {
          const toolResult = parseToolCall(logItem.messages.join("\n"));
          if (toolResult?.type === "READ_FILE" && toolResult?.result?.file_path) {
            const normalizedLogPath = extractPath(toolResult.result.file_path);
            if (normalizedLogPath) {
              currentFileContext = normalizedLogPath;
              if (!fileContextGroups[currentFileContext]) {
                fileContextGroups[currentFileContext] = [];
              }
            }
          }
        }

        // Add log to appropriate group
        if (currentFileContext) {
          fileContextGroups[currentFileContext]?.push(logItem);
        }
      });

      return fileContextGroups[normalizedFilePath] || [];
    };

    const fileSpecificLogs = getFileSpecificLogs();
     const filteredLogs = fileSpecificLogs.filter(logItem => {
       // Exclude INFO logs
       if (logItem.type !== "LLM_RESPONSE" && logItem.type !== "TOOL_CALL") {
         return false;
       }
       // Include LLM_RESPONSE segments
       if (logItem.type === "LLM_RESPONSE") {
         return true;
       }
       // Include non-READ_FILE tool calls
       if (logItem.type === "TOOL_CALL") {
         const toolResult = parseToolCall(logItem.messages.join("\n"));
         return !toolResult?.type?.includes("READ_FILE");
       }
       // Include other log types (except INFO which is already excluded above)
       return true;
     });

    // Count issues and fixes from the filtered logs
    const getCounts = () => {
      let issueCount = 0;
      let fixCount = 0;
      let warningCount = 0;

      filteredLogs.forEach(logItem => {
        if (logItem.type === "LLM_RESPONSE" && logItem.segments) {
          logItem.segments.forEach(segment => {
            if (segment.kind === "githubIssue") {
              issueCount++;
            } else if (segment.kind === "patch" || segment.kind === "githubPullRequest") {
              fixCount++;
            } else if (segment.kind === "warning") {
              warningCount++;
            }
          });
        }
      });

      return { issueCount, fixCount, warningCount };
    };

    const { issueCount, fixCount, warningCount } = getCounts();

    return (
      <Accordion type="single" collapsible defaultValue={filePath ?? "item-1"} className="w-full px-2 rounded mb-2">
        <AccordionItem
          value={filePath ?? "item-1"}
          className="border-none">
          <AccordionTrigger className="py-2 data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
            <span className="text-gray-400 flex items-center">
              <Eye className="inline-block w-4 h-4 mr-2"/> 
              <span className="font-medium">{normalizedFilePath}</span>
              {result.result?.current_range && (
                <span className="text-sm text-slate-500 ml-2">
                  Lines {result.result.current_range.start_line}-{result.result.current_range.end_line}
                </span>
              )}
                 {issueCount > 0 && (
                    <span className="text-sm text-slate-400 ml-2">
                      {issueCount} Github issue{issueCount !== 1 ? 's' : ''},
                    </span>
                  )}
                  {fixCount > 0 && (
                    <span className="text-sm text-slate-400 ml-2">
                      {fixCount} Fix suggested{fixCount !== 1 ? '' : ''}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="text-sm text-slate-400 ml-2">
                      {warningCount} Warning{warningCount !== 1 ? 's' : ''}
                    </span>
                  )}
             </span>        
           </AccordionTrigger>
           <AccordionContent className="p-0 overflow-hidden">
             <div className="p-4">
               {filteredLogs.length > 0 ? (
                 <div className="w-full flex flex-col items-start gap-3.5">
                   {filteredLogs.map((logItem: any, index: number) => (
                    <React.Fragment key={index}>
                      {logItem.type === "LLM_RESPONSE" && logItem.segments ? (
                        <div className="w-full break-words text-sm m-0">
                          <RenderLLMSegments 
                            segments={logItem.segments} 
                            repoId={repoId || ""} 
                            analysisId={analysisId} 
                            isLoadedFromDb={isLoadedFromDb || false} 
                          />
                        </div>
                      ) : logItem.type === "TOOL_CALL" ? (
                        <div className="w-full whitespace-pre-wrap text-sm m-0">
                          <RenderToolCall 
                            log={logItem} 
                            allLogs={allLogs}
                            repoId={repoId}
                            analysisId={analysisId}
                            isLoadedFromDb={isLoadedFromDb}
                          />
                        </div>
                      ) : (
                        <div className="w-full whitespace-pre-wrap text-sm text-muted-foreground">
                          {logItem.messages.join("\n")}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                // Only show "no logs found" if analysis is loaded from DB (not streaming)
                // During live streaming, don't show any message as logs may still be coming
                isLoadedFromDb ? (
                  <div className="text-center text-muted-foreground py-4">
                    No logs found for this file
                  </div>
                ) : null
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (result?.type === "EXTRACT_IMPORTS") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        {/* <p>
          <span className="px-2 py-1 border border-input font-medium rounded">
            Extract Imports
          </span>{" "}
          {extractPath(result.result.file_path)}
        </p> */}
      </div>
    );
  }

  if (result?.type === "EXTRACT_IMPORTS_RESULT") {
    // Don't display anything if there are no imports
    if (!result.result || result.result.length === 0) {
      return null;
    }

    const id = String(Math.floor(Math.random() * 100));

    return (
      <Accordion type="single" collapsible className="inline-block px-2 rounded mb-3">
        <AccordionItem value={`item-${id}`} className="border-none">
           <AccordionTrigger className=" py-0 rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
 <span className="text-gray-400">
            <Import className="inline-block w-4 h-4 mr-1"/> Extract {" "} {result.result?.file_path && extractPath(result.result?.file_path)}{" "} 
        </span>            </AccordionTrigger>
          <AccordionContent className="w-full bg-card p-2 border border-input rounded-md overflow-x-auto output-scrollbar text-xs text-muted-foreground leading-6">
            {result.result.map((item: string, i: number) => {
              const language = detectLanguage(item);
              return (
                <div key={i} className="flex items-center gap-1">
                  <Icon icon={language?.icon || ""} /> {extractPath(item)}
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (result?.type === "SELECT_FILES") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        {/* <p>
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Select Files
          </span>{" "}
          {result.result}
        </p> */}
      </div>
    );
  }

  if (result?.type === "SELECT_FILES_RESULT") {
    // Don't display anything if there are no files
    if (!result.result || result.result.length === 0) {
      return null;
    }

    const id = String(Math.floor(Math.random() * 100));

    return (
      <Accordion type="single" collapsible className="inline-block px-2 rounded mb-2">
        <AccordionItem value={`item-${id}`} className="border-none">
            <AccordionTrigger className=" py-0 rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
 <span className="text-gray-400">
            <BoxSelect className="inline-block w-4 h-4 mr-1"/> Select {" "} <span className="text-sm text-slate-500">{result.result?.file_path && extractPath(result.result?.file_path)}{" "}</span>
        </span>            </AccordionTrigger>
          <AccordionContent className="w-full bg-card p-2 border border-input rounded-md overflow-x-auto output-scrollbar text-xs text-muted-foreground leading-6">
            {result.result && result.result.length > 0 ? (
              result.result.map((item: string, i: number) => {
                const language = detectLanguage(item);
                return (
                  <div key={i} className="flex items-center gap-1">
                    <Icon icon={language?.icon || ""} /> {extractPath(item)}
                  </div>
                );
              })
            ) : (
              <div>No files found</div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (result?.type === "GREP_FILE_CONTENT") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        {/* <div className="border border-b-0 border-input py-3 px-1.5 rounded-t-md">
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Grep File
          </span>
        </div>

        <div className="border border-input p-3 rounded-b-md bg-card space-y-2">
          <p>Target string: {result.result.target_string}</p>
          <p>Repo name: {result.result.repo_name}</p>
        </div> */}
      </div>
    );
  }

  if (result?.type === "GREP_FILE_CONTENT_RESULT") {
    const id = String(Math.floor(Math.random() * 100));

    return (
      <Accordion type="single" collapsible className="inline-block px-2 rounded mb-2">
        <AccordionItem value={`item-${id}`} className="border-none">
            <AccordionTrigger className=" py-0 rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
 <span className="text-gray-400">
            <SearchCode className="inline-block w-4 h-4 mr-1"/> Searching Codebase {" "} <span className="text-sm text-slate-500">{result.result?.search_query}</span>{" "} 
        </span>            </AccordionTrigger>

          <AccordionContent className="w-full bg-card p-2 border border-input rounded-md overflow-x-auto output-scrollbar text-xs text-muted-foreground leading-6">
            <p>Files searched: {result.result.search_summary.files_searched}</p>
            <p>
              Total files with matches:{" "}
              {result.result.search_summary.total_files_with_matches}
            </p>

            <ul>
              {result.result.results_count &&
              result.result.results_count.length > 0
                ? result.result.results_count.map((item: any, i: number) => {
                    return <li key={i}>File Path: {item.file_path}</li>;
                  })
                : null}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <div className="w-full space-y-2 whitespace-pre-wrap break-words">
      <p>{log.messages.join("\n")}</p>
    </div>
  );
};
