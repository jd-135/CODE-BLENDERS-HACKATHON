import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8ff] flex flex-col items-center justify-center p-6 text-[#131b2e]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#eaedff] shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#e2e7ff] text-[#004ac6] flex items-center justify-center mx-auto shadow-inner">
          <FileQuestion className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold font-heading text-[#004ac6]">404</h1>
          <h2 className="text-xl font-bold font-heading text-[#131b2e]">
            Page / Scheme Not Found
          </h2>
          <p className="text-xs text-[#737686]">
            The requested resource or scholarship portal page does not exist or has been relocated in the national index.
          </p>
        </div>

        <Link href="/" className="w-full block">
          <Button
            className="w-full bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold h-10 rounded-xl gap-2 shadow-sm"
          >
            <Home className="h-4 w-4" />
            Return to Portal Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
