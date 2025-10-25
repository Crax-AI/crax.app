import { Database } from "./supabase/database.types"

// Database table types
export type Post = Database["public"]["Tables"]["posts"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Comment = Database["public"]["Tables"]["comments"]["Row"]
export type Like = Database["public"]["Tables"]["likes"]["Row"]

// Extended types with joins
export interface PostWithAuthor extends Post {
  author: Profile
  likes_count: number
  comments_count: number
  is_liked: boolean
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string
    first_name: string
    last_name: string
    image_url: string | null
    github_url: string
  }
}

export interface PostWithDetails extends Post {
  author: {
    id: string
    first_name: string
    last_name: string
    image_url: string | null
    github_url: string
  }
  likes_count: number
  comments: CommentWithAuthor[]
  is_liked: boolean
}
