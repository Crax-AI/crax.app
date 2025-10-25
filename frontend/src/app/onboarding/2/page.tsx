import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";

export default function OnboardingPage2() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-center">Set up your profile</h1>
        
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="university">
              University*
            </FieldLabel>
            <FieldContent>
              <Input
                id="university"
                type="text"
                placeholder="UC Berkeley"
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
                />
              </div>
            </FieldContent>
          </Field>
          
          <Button className="flex flex row w-full items-center">
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}