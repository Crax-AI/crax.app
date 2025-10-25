import { NextResponse } from "next/server";
import { Resend } from "resend";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Check if profile exists, create one if it doesn't
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // Extract user metadata from auth user
      const userMetadata = data.user.user_metadata || {};
      const avatarUrl = data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null;
      const email = data.user.email || null;
      
      // Check if this is a LinkedIn OAuth connection
      const isLinkedInConnection = userMetadata.provider === 'linkedin' || 
                                   userMetadata.provider === 'linkedin_oidc' ||
                                   userMetadata.iss?.includes('linkedin') ||
                                   userMetadata.aud?.includes('linkedin');

      if (!existingProfile) {
        // Parse name from user metadata or use email prefix as fallback
        let firstName = userMetadata.first_name || userMetadata.given_name || '';
        let lastName = userMetadata.last_name || userMetadata.family_name || '';
        
        // If no name found, try to parse from full_name
        if (!firstName && !lastName && userMetadata.full_name) {
          const nameParts = userMetadata.full_name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        // Fallback to email prefix if still no name
        if (!firstName && !lastName && email) {
          firstName = email.split('@')[0];
          lastName = '';
        }
        
        // Ensure we have at least a first name
        if (!firstName) {
          firstName = 'User';
        }

        // Generate a unique username from GitHub preferred_name, email, or fallback
        let username = '';
        
        // First try to get preferred_name from GitHub metadata
        if (userMetadata.preferred_name) {
          username = userMetadata.preferred_name.toLowerCase().replace(/[^a-z0-9-]/g, '');
        }
        // Fallback to email username if preferred_name not available
        else if (email) {
          username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        // Final fallback using first name
        else {
          username = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).substr(2, 4);
        }
        
        // Ensure username is not empty and add random suffix if needed
        if (!username) {
          username = 'user' + Math.random().toString(36).substr(2, 6);
        }

        // Create profile with required fields
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            image_url: avatarUrl,
            github_url: '', // Will be filled during onboarding
            linkedin_url: '', // Will be filled during onboarding
            username: username,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Continue with redirect even if profile creation fails
          // The user can still proceed and we'll handle it in onboarding
        }

        // Send welcome email
        if (email) {
          await resend.emails.send({
            from: 'Crax <hello@crax.app>',
            to: [email],
            subject: 'Welcome to Crax!',
            html: `
              <div style="font-family: Arial, sans-serif; color: #222;">
                <p>Dear Builder,</p>
                <p>Welcome to Crax - the social platform for builders.<br>
                You can access the platform at <a href="https://crax.app/app" style="color:#1a73e8;">https://crax.app/app</a> to share your journey with others.</p>
                <p>Keep hacking on,<br>
                <a href="https://crax.app" style="color:#1a73e8;">Crax</a></p>
              </div>
            `,
          });
        }
      } else if (isLinkedInConnection) {
        // Update existing profile with LinkedIn data
        const updateData: {
          image_url?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
        } = {};

        // Update profile picture if available
        if (avatarUrl) {
          updateData.image_url = avatarUrl;
        }

        // Update email if available
        if (email) {
          updateData.email = email;
        }

        // Update first name and last name from LinkedIn metadata
        const firstName = userMetadata.given_name || userMetadata.first_name || '';
        const lastName = userMetadata.family_name || userMetadata.last_name || '';
        
        if (firstName) {
          updateData.first_name = firstName;
        }
        if (lastName) {
          updateData.last_name = lastName;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', data.user.id);

        if (updateError) {
          console.error('Error updating profile with LinkedIn data:', updateError);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`);
}
