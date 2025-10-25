"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { useUserProfile } from "@/hooks/use-user-profile";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage2() {
  const router = useRouter();
  const { user, profile, loading: profileLoading } = useUserProfile();
  const [formData, setFormData] = useState({
    affiliation: "",
    linkedinUrl: "",
    devpostUrl: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial values from profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        affiliation: profile.affiliation || "",
        linkedinUrl: profile.linkedin_url ? profile.linkedin_url.replace('https://linkedin.com/in/', '') : "",
        devpostUrl: profile.devpost_url ? profile.devpost_url.replace('https://devpost.com/', '') : ""
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Construct full URLs
      const linkedinUrl = formData.linkedinUrl 
        ? `https://linkedin.com/in/${formData.linkedinUrl}`
        : null;
      const devpostUrl = formData.devpostUrl 
        ? `https://devpost.com/${formData.devpostUrl}`
        : null;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          affiliation: formData.affiliation.trim(),
          linkedin_url: linkedinUrl,
          devpost_url: devpostUrl,
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Navigate to next step
      router.push('/onboarding/3');
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
        <h1 className="text-2xl font-semibold text-center">Set up your builder profile</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="affiliation">
              University / Company*
            </FieldLabel>
            <FieldContent>
              <Input
                id="affiliation"
                type="text"
                placeholder="UC Berkeley"
                value={formData.affiliation}
                onChange={(e) => handleInputChange('affiliation', e.target.value)}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="linkedin-url">
              LinkedIn URL*
            </FieldLabel>
            <FieldContent>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2 w-1/2">https://linkedin.com/in/</span>
                <Input
                  id="linkedin-url"
                  type="text"
                  placeholder="john-doe"
                  className="w-1/2"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                  required
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="devpost-url">
              Devpost URL
            </FieldLabel>
            <FieldContent>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2 w-1/2">https://devpost.com/</span>
                <Input
                  id="devpost-url"
                  type="text"
                  placeholder="john-doe"
                  className="w-1/2"
                  value={formData.devpostUrl}
                  onChange={(e) => handleInputChange('devpostUrl', e.target.value)}
                />
              </div>
            </FieldContent>
          </Field>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="flex flex-row w-full items-center"
            disabled={isSubmitting || !formData.affiliation.trim() || !formData.linkedinUrl.trim()}
          >
            {isSubmitting ? "Saving..." : "Continue"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}