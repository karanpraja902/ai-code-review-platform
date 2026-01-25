import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2Icon className="h-6 w-6 animate-spin" />
        <span>Loading settings...</span>
      </div>
    </div>
  );
}
