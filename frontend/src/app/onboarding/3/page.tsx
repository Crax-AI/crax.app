"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OnboardingPage3() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6 text-center">
        <h1 className="text-2xl font-semibold">
          Congrats, you&apos;re all set up!
        </h1>
        
        <p className="text-muted-foreground">
          It may take a few minutes for your existing projects to be loaded.
        </p>
        
        <Button asChild className="flex flex-row w-full items-center">
          <Link href="/app/feed">
            Continue to platform
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}