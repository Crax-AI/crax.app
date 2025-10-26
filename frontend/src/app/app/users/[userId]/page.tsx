/*
This is a given user's profile page.

Towards the top you should see the user's profile:
  - Profile image
  - Full name
  - Headline

Then the user page has two tabs.

Projects tab - a list of projects the user has worked on.
Each project has:
  - Title
  - Tagline (optional): a one-liner of the project
  - Description
  - Thumbnail image (optional)
  - Github URL (optional)
  - Devpost URL (optional)
  - Started at time: this is when the project was actually started (created_at is just when the DB record got created)

Posts tab - a list of posts made by the user.
This is just like the feed page, but only shows posts made by the user.

Actions that can be performed on the user:
  - Follow user (you cannot follow yourself)
  - Mark as cracked (not yet)
  - If user id is yourself, redirect to /app/profile
*/

"use client"

import { User, UserPlus, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getUserPosts, getFollowingCount, getFollowerCount, getUserProjects, getUserProfile, isFollowingUser, followUser, unfollowUser, getUserPostsCount } from "@/lib/supabase/posts"
import { PostData, Post } from "@/components/post"
import { Project } from "@/components/project"
import { Tables } from "@/lib/supabase/database.types"

type ProjectWithProfile = Tables<"projects"> & {
  profiles: Tables<"profiles">
}

export default function UserPage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useUserProfile()
  const router = useRouter()
  
  const [userProfile, setUserProfile] = useState<Tables<"profiles"> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'projects' | 'posts'>('projects')
  
  // Posts state
  const [posts, setPosts] = useState<PostData[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  
  // Projects state
  const [projects, setProjects] = useState<Tables<"projects">[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  
  // Follow state
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (currentUser?.id === userId) {
      router.push('/app/profile')
    }
  }, [currentUser?.id, userId, router])

  // Fetch user profile data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return

      try {
        setLoading(true)
        
        // Fetch user profile
        const profile = await getUserProfile(userId)
        if (!profile) {
          setError('User not found')
          return
        }
        setUserProfile(profile)

        // Fetch follow status and counts
        if (currentUser?.id) {
          const [following, followers, followStatus, postsCount] = await Promise.all([
            getFollowingCount(userId),
            getFollowerCount(userId),
            isFollowingUser(currentUser.id, userId),
            getUserPostsCount(userId)
          ])
          
          setFollowingCount(following)
          setFollowersCount(followers)
          setIsFollowing(followStatus)
          setPostsCount(postsCount)
        } else {
          // If not logged in, still fetch posts count
          const postsCount = await getUserPostsCount(userId)
          setPostsCount(postsCount)
        }

      } catch (err) {
        console.error("Error fetching user data:", err)
        setError('Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [userId, currentUser?.id])

  // Fetch projects when projects tab is active
  useEffect(() => {
    const fetchProjects = async () => {
      if (activeTab !== 'projects' || !userId) return

      try {
        setProjectsLoading(true)
        const userProjects = await getUserProjects(userId)
        setProjects(userProjects)
      } catch (err) {
        console.error("Error fetching projects:", err)
      } finally {
        setProjectsLoading(false)
      }
    }

    fetchProjects()
  }, [activeTab, userId])

  // Fetch posts when posts tab is active
  useEffect(() => {
    const fetchPosts = async () => {
      if (activeTab !== 'posts' || !userId) return

      try {
        setPostsLoading(true)
        const userPosts = await getUserPosts(userId, 20, 0, currentUser?.id)
        setPosts(userPosts)
      } catch (err) {
        console.error("Error fetching posts:", err)
      } finally {
        setPostsLoading(false)
      }
    }

    fetchPosts()
  }, [activeTab, userId, currentUser?.id])

  const handleFollowToggle = async () => {
    if (!currentUser?.id || !userId) return

    try {
      setFollowLoading(true)
      
      if (isFollowing) {
        const success = await unfollowUser(currentUser.id, userId)
        if (success) {
          setIsFollowing(false)
          setFollowersCount(prev => Math.max(0, prev - 1))
        }
      } else {
        const success = await followUser(currentUser.id, userId)
        if (success) {
          setIsFollowing(true)
          setFollowersCount(prev => prev + 1)
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err)
    } finally {
      setFollowLoading(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border p-6">
          <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
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
  if (error || !userProfile) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border p-6">
          <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">Error: {error || 'User not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const fullName = `${userProfile.first_name} ${userProfile.last_name}`
  const username = userProfile.username || 'user'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-6">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-8">
          <Avatar className="h-24 w-24">
            <AvatarImage src={userProfile.image_url || ""} alt={fullName} />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
              {currentUser?.id && currentUser.id !== userId && (
                <Button 
                  variant={isFollowing ? "outline" : "default"} 
                  size="sm"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <p className="text-muted-foreground mb-2">@{username}</p>
            {userProfile.headline && (
              <p className="text-foreground mb-2 font-medium">{userProfile.headline}</p>
            )}
            {userProfile.affiliation && (
              <p className="text-muted-foreground mb-4">{userProfile.affiliation}</p>
            )}
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>{followingCount} Following</span>
              <span>{followersCount} Followers</span>
              <span>{postsCount} Posts</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'projects' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </Button>
          <Button
            variant={activeTab === 'posts' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'projects' && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Projects</h3>
            {projectsLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No public projects found.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Project
                    key={project.id}
                    project={{
                      ...project,
                      profiles: userProfile
                    } as ProjectWithProfile}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Posts</h3>
            {postsLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No posts found.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {posts.map((post) => (
                  <Post
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id}
                    onLike={(postId) => console.log("Liked post:", postId)}
                    onComment={(postId, comment) => console.log("Comment on post:", postId, "Comment:", comment)}
                    onProfileClick={(profileUrl) => console.log("Navigate to profile:", profileUrl)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}