/*
The Profile page shows the user's own profile information and posts.
*/

import { User, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfilePage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-6">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-8">
          <Avatar className="h-24 w-24">
            <AvatarImage src="" alt="Profile" />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold text-foreground">Your Name</h2>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
            
            <p className="text-muted-foreground mb-2">@username</p>
            <p className="text-foreground mb-4">
              Bio goes here. Tell people about yourself, your projects, and what you&apos;re working on.
            </p>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>0 Following</span>
              <span>0 Followers</span>
              <span>0 Posts</span>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Posts</h3>
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              You haven&apos;t posted anything yet. Start sharing your projects and ideas!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
