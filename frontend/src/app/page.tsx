import { ExternalLink } from "lucide-react";
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <h1 className="text-4xl font-bold text-white">Crax.</h1>
      <p className="text-4xl font-bold text-white">The social platform for cracked builders.</p>
      <p className="text-muted-foreground">est. Cal Hacks 12.0</p>

      <Link href="/auth/login" className="flex flex-row items-center gap-2 curor-pointer text-white mt-4">
        Sign up
        <ExternalLink className="size-4" />
      </Link>
    </div>
  );
}