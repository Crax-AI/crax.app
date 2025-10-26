"use client";

import { useState } from "react";
import { User, LogOut } from "lucide-react";
import { useUserProfile } from "@/hooks/use-user-profile";
import { createClient } from "@/lib/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

export function UserProfile() {
  const router = useRouter();
  const { user, profile, loading } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push("/");
  };

  return (
    <div className="border-t border-border p-2 sm:p-4">
      {loading ? (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0 hidden sm:block">
            <div className="h-4 bg-muted animate-pulse rounded mb-1" />
            <div className="h-3 bg-muted animate-pulse rounded w-20" />
          </div>
        </div>
      ) : user && profile ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={profile.image_url || undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                  <AvatarFallback className="text-xs">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{profile.username || "user"}
                  </p>
                </div>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-sm font-medium text-foreground">
                {profile.first_name} {profile.last_name}
              </div>
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {user.email}
              </div>
              <div className="border-t border-border my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback>
              <User className="h-4 w-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-sm font-medium text-foreground truncate">
              Guest User
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Not signed in
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
