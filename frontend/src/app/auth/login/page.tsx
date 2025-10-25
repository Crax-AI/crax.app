"use client";

import Image from "next/image";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {/* Logo and Branding */}
        <div className="mb-8">
          <Image
            src="/crax-logo-light.png"
            alt="Crax Logo"
            width={64}
            height={64}
            className="dark:hidden mx-auto mb-4"
          />
          <Image
            src="/crax-logo-dark.png"
            alt="Crax Logo"
            width={64}
            height={64}
            className="hidden dark:block mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold mb-2">Crax</h1>
          <p className="text-muted-foreground">The social platform for builders</p>
        </div>

        {/* GitHub Login Button */}
        <Button
          onClick={handleGitHubLogin}
          className="flex items-center gap-2 mx-auto"
          disabled={isLoading}
        >
          <Github className="w-4 h-4" />
          Sign in with GitHub
          {isLoading && <Spinner className="size-4" />}
        </Button>
      </div>
    </div>
  );
}