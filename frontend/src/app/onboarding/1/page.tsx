"use client";

import { ChevronRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";

export default function OnboardingPage1() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-center">
          Connect your accounts
        </h1>

        <div className="space-y-4">
          <Field>
            <FieldLabel className="block text-sm font-medium">
              Github
            </FieldLabel>
            <FieldContent>
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                type="button"
                onClick={() => {
                  window.open(
                    "https://github.com/apps/crax-app/installations/new",
                    "githubPopup",
                    "width=600,height=700,noopener"
                  );
                }}
              >
                <Github className="h-4 w-4" />
                Connect Github
              </Button>
            </FieldContent>
            {/* <FieldDescription>
                Connect your Github account to get started.
            </FieldDescription> */}
          </Field>

          <Button asChild className="flex flex-row w-full items-center">
            <Link href="/onboarding/2">
              Continue
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
