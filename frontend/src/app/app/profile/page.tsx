/*
The Profile page shows the user's own profile information and posts.
*/

"use client"

import { User, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useEffect, useState } from "react"
import { getUserPosts, getFollowingCount, getFollowerCount } from "@/lib/supabase/posts"
import { PostData, Post } from "@/components/post"

export default function ProfilePage() {
  const { user, profile, loading, error } = useUserProfile()
  const [posts, setPosts] = useState<PostData[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return

      try {
        // Fetch user posts
        const userPosts = await getUserPosts(user.id, 20, 0, user.id)
        setPosts(userPosts)
        setPostsCount(userPosts.length)

        // Fetch following and followers count
        const [following, followers] = await Promise.all([
          getFollowingCount(user.id),
          getFollowerCount(user.id)
        ])
        
        setFollowingCount(following)
        setFollowersCount(followers)
      } catch (err) {
        console.error("Error fetching profile data:", err)
      } finally {
        setPostsLoading(false)
      }
    }

    fetchProfileData()
  }, [user?.id])
  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border p-6">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border p-6">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">Error loading profile: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Show not authenticated state
  if (!user || !profile) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border p-6">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    )
  }

  const fullName = `${profile.first_name} ${profile.last_name}`
  const username = profile.username || 'user'

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
            <AvatarImage src={profile.image_url || ""} alt={fullName} />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
            
            <p className="text-muted-foreground mb-2">@{username}</p>
            <p className="text-foreground mb-4">
              {profile.linkedin_data_raw ? 
                (typeof profile.linkedin_data_raw === 'object' && profile.linkedin_data_raw !== null && 'summary' in profile.linkedin_data_raw ? 
                  String(profile.linkedin_data_raw.summary) : 
                  'Bio goes here. Tell people about yourself, your projects, and what you\'re working on.') :
                'Bio goes here. Tell people about yourself, your projects, and what you\'re working on.'
              }
            </p>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>{followingCount} Following</span>
              <span>{followersCount} Followers</span>
              <span>{postsCount} Posts</span>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Your Posts</h3>
          {postsLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You haven&apos;t posted anything yet. Start sharing your projects and ideas!
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {posts.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onLike={(postId) => console.log("Liked post:", postId)}
                  onComment={(postId, comment) => console.log("Comment on post:", postId, "Comment:", comment)}
                  onProfileClick={(profileUrl) => console.log("Navigate to profile:", profileUrl)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
