"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled portal application error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#faf8ff] flex flex-col items-center justify-center p-6 text-[#131b2e]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#eaedff] shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading text-[#131b2e]">
            System Resilience Recovery
          </h2>
          <p className="text-xs text-[#737686]">
            An unexpected error occurred during execution. The system isolated the fault safely without corrupting any ledger or application states.
          </p>
          {error.message && (
            <div className="mt-4 p-3 bg-[#f2f3ff] rounded-xl text-left border border-[#eaedff]">
              <span className="text-[10px] font-bold text-[#737686] uppercase block">Diagnostics:</span>
              <p className="text-xs font-mono text-[#ba1a1a] mt-1 break-all">
                {error.message}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold h-10 rounded-xl gap-2 shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Retry Action
          </Button>

          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full border-[#eaedff] hover:bg-[#f2f3ff] text-xs font-semibold h-10 rounded-xl gap-2"
            >
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
