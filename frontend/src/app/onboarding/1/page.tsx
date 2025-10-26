"use client";

import { useState } from "react";
import { ChevronRight, Github, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage1() {
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);

  const handleLinkedInConnect = async () => {
    setIsConnectingLinkedIn(true);
    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/2`,
        }
      });

      if (error) {
        console.error('LinkedIn connection error:', error);
        alert('Failed to connect LinkedIn. Please try again.');
      } else {
        setLinkedinConnected(true);
      }
    } catch (err) {
      console.error('LinkedIn connection error:', err);
      alert('Failed to connect LinkedIn. Please try again.');
    } finally {
      setIsConnectingLinkedIn(false);
    }
  };

  const handleGithubConnect = () => {
    window.open(
      "https://github.com/apps/crax-app/installations/new",
      "githubPopup",
      "width=600,height=700,noopener"
    );
    setGithubConnected(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-center">
          Connect your accounts
        </h1>

        <div className="space-y-4">
          <Field>
            <FieldLabel className="block text-sm font-medium">
              Github*
            </FieldLabel>
            <FieldContent>
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                type="button"
                onClick={handleGithubConnect}
                disabled={githubConnected}
              >
                <Github className="h-4 w-4" />
                {githubConnected ? "GitHub Connected" : "Connect GitHub"}
              </Button>
            </FieldContent>
            <FieldDescription>
              Grant access to the repositories and organizations that you want to showcase.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel className="block text-sm font-medium">
              LinkedIn*
            </FieldLabel>
            <FieldContent>
              <Button
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                type="button"
                onClick={handleLinkedInConnect}
                disabled={isConnectingLinkedIn || linkedinConnected}
              >
                <Linkedin className="h-4 w-4" />
                {isConnectingLinkedIn ? "Connecting..." : linkedinConnected ? "LinkedIn Connected" : "Connect LinkedIn"}
              </Button>
            </FieldContent>
          </Field>

          {githubConnected && linkedinConnected ? (
            <Button asChild className="flex flex-row w-full items-center">
              <Link href="/onboarding/2">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button 
              className="flex flex-row w-full items-center"
              disabled={true}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
