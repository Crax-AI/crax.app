import { ExternalLink } from "lucide-react";
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-between min-h-screen h-screen bg-black px-4 py-8">
      {/* Main Content */}
      <div className="flex flex-col items-center flex-1 justify-center w-full">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3">Crax.</h1>
        <p className="text-2xl md:text-3xl font-bold text-white text-center mb-1">
          The social platform for builders.
        </p>
        <p className="text-muted-foreground mb-8">est. CalHacks 12.0</p>
        
        {/* Taglines / Value Props */}
        <div className="flex flex-col items-center gap-1 mb-8">
          <span className="rounded-full bg-white/5 px-4 py-1 text-sm text-white font-medium border border-white/10 shadow">
            Build in public
          </span>
          <span className="rounded-full bg-white/5 px-4 py-1 text-sm text-white font-medium border border-white/10 shadow">
            Share your journey with fellow builders
          </span>
          <span className="rounded-full bg-white/5 px-4 py-1 text-sm text-white font-medium border border-white/10 shadow">
            Turn your commits into build updates
          </span>
        </div>

        <Link href="/auth/login" className="flex flex-row items-center gap-2 cursor-pointer text-black font-semibold bg-white hover:bg-zinc-100 active:bg-zinc-300 px-6 py-2 rounded-lg shadow transition-colors">
          Sign up
          <ExternalLink className="size-4" />
        </Link>
      </div>
      {/* Subtle Footer */}
      <footer className="w-full flex justify-center mt-8">
        <p className="text-xs text-muted-foreground tracking-wide pb-2">For builders. By builders.</p>
      </footer>
    </div>
  );
}