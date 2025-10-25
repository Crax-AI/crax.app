/*
The feed page shows a list of other people's posts in chronological order.

At the top, you can also create your own post.
*/
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Post, PostData } from "@/components/post"
import { CreatePost } from "@/components/create-post"
import { getPosts } from "@/lib/supabase/posts"
import { useUserProfile } from "@/hooks/use-user-profile"

export default function FeedPage() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, loading: userLoading } = useUserProfile()

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        const fetchedPosts = await getPosts(20, 0, user?.id)
        setPosts(fetchedPosts)
      } catch (err) {
        console.error("Error fetching posts:", err)
        setError("Failed to load posts. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (!userLoading) {
      fetchPosts()
    }
  }, [user?.id, userLoading])

  const handleLike = (postId: string) => {
    console.log("Liked post:", postId)
    // TODO: Implement like functionality
  }

  const handleComment = (postId: string, comment: string) => {
    console.log("Comment on post:", postId, "Comment:", comment)
    // TODO: Implement comment functionality
  }

  const handleProfileClick = (profileUrl: string) => {
    console.log("Navigate to profile:", profileUrl)
    // TODO: Implement navigation to profile
  }

  const handlePostCreated = async () => {
    // Refresh posts after creating a new one
    try {
      setLoading(true)
      const fetchedPosts = await getPosts(20, 0, user?.id)
      setPosts(fetchedPosts)
    } catch (err) {
      console.error("Error refreshing posts:", err)
      setError("Failed to refresh posts. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Feed</h1>
        
        {/* Create Post */}
        <CreatePost onPostCreated={handlePostCreated} />
      </div>

      {/* Feed Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onLike={handleLike}
              onComment={handleComment}
              onProfileClick={handleProfileClick}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No posts to show. Check back later for updates!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}