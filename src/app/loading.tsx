import { GraduationCap, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#faf8ff] flex flex-col items-center justify-center p-6 text-[#131b2e]">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#004ac6] via-[#2563eb] to-[#712ae2] p-[2px] shadow-lg animate-pulse">
            <div className="h-full w-full bg-white rounded-2xl flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-[#004ac6] animate-bounce" />
            </div>
          </div>
          <Sparkles className="h-5 w-5 text-[#712ae2] absolute -top-1 -right-1 animate-spin" />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-[#131b2e] font-heading">
            ScholarHub SAMS
          </h3>
          <p className="text-xs text-[#737686]">
            Initializing secure cryptographic ledger & data layer...
          </p>
        </div>
      </div>
    </div>
  );
}
