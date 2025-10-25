/*
A post contains:
  - description: text content of the post
  - either an image_url or video_url or neither

The post also shows the profile of the author (click to open profile URL):
  - Avatar of profile picture
  - Full name
  - Tagline

The post also has metadata:
  - created_at: should be displayed as a time ago, e.g. 12h, 1m, now
  - updated_at (if created_at != updated_at, then we know the post was edited)
  - likes count
  - type: e.g. update, post

A post can have zero or more comments:
  - Each comment is just a text description
  - At the moment, comments cannot be nested

Actions that can be performed on the post:
  - Like
  - Comment
*/

"use client"

import { useState } from "react"
import Image from "next/image"
import { MessageCircle, Heart, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export interface Comment {
  id: string
  description: string
  author: {
    full_name: string
    tagline: string
    profile_picture_url?: string | null
  }
  created_at: string
}

export interface PostData {
  id: string
  description: string
  image_url?: string | null
  video_url?: string | null
  author: {
    full_name: string
    tagline: string
    profile_picture_url?: string | null
    profile_url: string
  }
  created_at: string
  updated_at: string
  likes_count: number
  type: string
  comments: Comment[]
  is_liked?: boolean
}

interface PostProps {
  post: PostData
  onLike?: (postId: string) => void
  onComment?: (postId: string, comment: string) => void
  onProfileClick?: (profileUrl: string) => void
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const postDate = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000)

  if (diffInSeconds < 60) return "now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`
  return `${Math.floor(diffInSeconds / 2592000)}mo`
}

export const Post = ({ post, onLike, onComment, onProfileClick }: PostProps) => {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count)

  const isEdited = post.created_at !== post.updated_at
  const timeAgo = formatTimeAgo(post.created_at)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
    onLike?.(post.id)
  }

  const handleComment = () => {
    if (newComment.trim()) {
      onComment?.(post.id, newComment.trim())
      setNewComment("")
    }
  }

  const handleProfileClick = () => {
    onProfileClick?.(post.author.profile_url)
  }

  return (
    <div className="border-b border-border p-6 hover:bg-muted/30 transition-colors">
      <div className="flex gap-4">
        {/* Author Avatar */}
        <Avatar 
          className="h-10 w-10 cursor-pointer" 
          onClick={handleProfileClick}
        >
          <AvatarImage src={post.author.profile_picture_url || undefined} alt={post.author.full_name} />
          <AvatarFallback>
            {post.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          {/* Author Info */}
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={handleProfileClick}
              className="font-semibold text-foreground hover:underline"
            >
              {post.author.full_name}
            </button>
            <span className="text-muted-foreground">@{post.author.tagline}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timeAgo}</span>
            {isEdited && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground text-xs">edited</span>
              </>
            )}
            <Badge variant="secondary" className="ml-auto text-xs">
              {post.type}
            </Badge>
          </div>
          
          {/* Post Content */}
          <p className="text-foreground mb-4 whitespace-pre-wrap">
            {post.description}
          </p>

          {/* Media Content */}
          {post.image_url && (
            <div className="mb-4">
              <Image 
                src={post.image_url} 
                alt="Post image" 
                width={500}
                height={300}
                className="rounded-lg max-w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          {post.video_url && (
            <div className="mb-4">
              <video 
                src={post.video_url} 
                controls 
                className="rounded-lg max-w-full h-auto max-h-96"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-6 text-muted-foreground">
            <button 
              className="flex items-center gap-2 hover:text-foreground transition-colors"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{post.comments.length}</span>
            </button>
            
            <button 
              className={`flex items-center gap-2 transition-colors ${
                isLiked 
                  ? "text-red-500 hover:text-red-600" 
                  : "hover:text-foreground"
              }`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              <span className="text-sm">{likesCount}</span>
            </button>
            
            <button className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Share className="h-4 w-4" />
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-border">
              {/* Add Comment */}
              <div className="flex gap-3 mb-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <span className="text-xs">U</span>
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-transparent border border-border rounded-lg p-3 text-foreground placeholder:text-muted-foreground resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleComment} disabled={!newComment.trim()}>
                      Comment
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.profile_picture_url || undefined} alt={comment.author.full_name} />
                      <AvatarFallback>
                        {comment.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {comment.author.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {comment.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}