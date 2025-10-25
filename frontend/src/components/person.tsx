/*
A Person component displays a user's profile information in a card format.
It shows:
  - Profile picture
  - Full name
  - Username (from GitHub URL)
  - Bio/about text (truncated)
  - Join date
  - Click to navigate to their profile page
*/

"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Profile } from "@/lib/types"

interface PersonProps {
  profile: Profile
}

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return "Joined today"
  if (diffInDays === 1) return "Joined yesterday"
  if (diffInDays < 7) return `Joined ${diffInDays} days ago`
  if (diffInDays < 30) return `Joined ${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `Joined ${Math.floor(diffInDays / 30)} months ago`
  return `Joined ${Math.floor(diffInDays / 365)} years ago`
}

function getBioText(profile: Profile): string {
  if (profile.about) {
    return profile.about
  }
  
  if (profile.linkedin_data_raw && typeof profile.linkedin_data_raw === 'object' && profile.linkedin_data_raw !== null && 'summary' in profile.linkedin_data_raw) {
    return String(profile.linkedin_data_raw.summary)
  }
  
  return "No bio available"
}

export const Person = ({ profile }: PersonProps) => {
  const router = useRouter()
  
  const fullName = `${profile.first_name} ${profile.last_name}`
  const username = profile.username || 'user'
  const bio = getBioText(profile)
  const joinDate = formatJoinDate(profile.created_at)
  
  const handleClick = () => {
    router.push(`/app/user/${profile.id}`)
  }
  
  return (
    <div 
      className="p-6 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex gap-4">
        {/* Profile Picture */}
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={profile.image_url || undefined} alt={fullName} />
          <AvatarFallback>
            {profile.first_name[0]}{profile.last_name[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          {/* Name and Username */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {fullName}
            </h3>
            <span className="text-muted-foreground text-sm truncate">
              @{username}
            </span>
          </div>
          
          {/* Bio */}
          <p className="text-foreground text-sm mb-3 line-clamp-3">
            {bio}
          </p>
          
          {/* Meta Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{joinDate}</span>
            {profile.devpost_url && (
              <Badge variant="secondary" className="text-xs">
                Devpost
              </Badge>
            )}
            {profile.linkedin_url && (
              <Badge variant="secondary" className="text-xs">
                LinkedIn
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
