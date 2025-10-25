/*
The feed page shows a list of other people's posts in chronological order.

At the top, you can also create your own post.
*/
"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Post, PostData } from "@/components/post"
import { getPosts } from "@/lib/supabase/posts"

export default function FeedPage() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        const fetchedPosts = await getPosts(20, 0)
        setPosts(fetchedPosts)
      } catch (err) {
        console.error("Error fetching posts:", err)
        setError("Failed to load posts. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Feed</h1>
        
        {/* Create Post */}
        <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" alt="Profile" />
            <AvatarFallback>
              <span className="text-sm">U</span>
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <textarea
              placeholder="What's happening? Share your latest project or idea..."
              className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm">Post</Button>
            </div>
          </div>
        </div>
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