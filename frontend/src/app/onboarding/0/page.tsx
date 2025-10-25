"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { useUserProfile } from "@/hooks/use-user-profile";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage0() {
  const router = useRouter();
  const { user, profile, loading: profileLoading } = useUserProfile();
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial values from profile data
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Clean username: lowercase, alphanumeric and hyphens only
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: cleanUsername,
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Navigate to next step
      router.push('/onboarding/1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-center">Create your account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field with @ symbol */}
          <Field>
            <FieldLabel htmlFor="username">
              Username*
            </FieldLabel>
            <FieldContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                  @
                </span>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  pattern="[a-zA-Z0-9-]+"
                  title="Username can only contain letters, numbers, and hyphens"
                  className="pl-8"
                />
              </div>
            </FieldContent>
          </Field>

          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}

          <Button 
            type="submit" 
            className="w-full flex items-center justify-center"
            disabled={isSubmitting || !username.trim()}
          >
            {isSubmitting ? "Saving..." : "Continue"}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
}
