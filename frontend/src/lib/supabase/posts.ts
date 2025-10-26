import { createClient } from "./client"
import { PostWithDetails, Profile } from "../types"
import { PostData } from "@/components/post"
import { Tables } from "./database.types"

// Type for Supabase join result
interface PostWithAuthorJoin {
  id: string
  description: string
  image_url: string | null
  video_url: string | null
  type: string
  created_at: string
  updated_at: string
  author_id: string
  author: {
    id: string
    first_name: string
    last_name: string
    image_url: string | null
    github_url: string
    affiliation: string | null
    headline: string | null
  }
}

// Transform database data to PostData format
function transformPostData(post: PostWithDetails): PostData {
  return {
    id: post.id,
    description: post.description,
    image_url: post.image_url,
    video_url: post.video_url,
    author: {
      full_name: `${post.author.first_name} ${post.author.last_name}`,
      tagline: post.author.headline || '',
      affiliation: post.author.affiliation,
      profile_picture_url: post.author.image_url,
      profile_url: `/app/users/${post.author.id}`
    },
    created_at: post.created_at,
    updated_at: post.updated_at,
    likes_count: post.likes_count,
    type: post.type,
    comments: post.comments.map(comment => ({
      id: comment.id,
      description: comment.description,
      author: {
        full_name: `${comment.author.first_name} ${comment.author.last_name}`,
        tagline: comment.author.headline || '',
        profile_picture_url: comment.author.image_url || null
      },
      created_at: comment.created_at
    })),
    is_liked: post.is_liked
  }
}

export async function getPosts(limit: number = 20, offset: number = 0, currentUserId?: string): Promise<PostData[]> {
  const supabase = createClient()

  // First, get the posts with author information
  console.log("Fetching posts with author information")
  
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  console.log("Posts:", posts)

  if (postsError) {
    console.error("Error fetching posts:", postsError)
    return []
  }

  if (!posts || posts.length === 0) {
    return []
  }

  // Get likes count and check if current user liked each post
  const postIds = posts.map(post => post.id)
  
  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("post_id, user_id")
    .in("post_id", postIds)

  if (likesError) {
    console.error("Error fetching likes:", likesError)
  }

  // Get comments for each post
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select(`
      *,
      author:profiles!comments_author_id_fkey(*)
    `)
    .in("post_id", postIds)
    .order("created_at", { ascending: true })

  if (commentsError) {
    console.error("Error fetching comments:", commentsError)
  }

  // Transform the data to match our PostWithDetails interface
  const postsWithDetails: PostWithDetails[] = posts.map((post: PostWithAuthorJoin) => {
    const postLikes = likes?.filter(like => like.post_id === post.id) || []
    const postComments = comments?.filter(comment => comment.post_id === post.id) || []
    const isLiked = currentUserId ? postLikes.some(like => like.user_id === currentUserId) : false
    
    return {
      ...post,
      author: post.author,
      likes_count: postLikes.length,
      comments: postComments.map((comment: { id: string; description: string; created_at: string; post_id: string; author_id: string; author: { id: string; first_name: string; last_name: string; image_url: string | null; github_url: string; affiliation: string | null; headline: string | null } }) => ({
        id: comment.id,
        description: comment.description,
        created_at: comment.created_at,
        post_id: comment.post_id,
        author_id: comment.author_id,
        updated_at: comment.created_at, // Use created_at as updated_at for comments
        author: comment.author
      })),
      is_liked: isLiked
    }
  })

  // Transform to PostData format
  return postsWithDetails.map(transformPostData)
}

export async function getPostById(id: string): Promise<PostWithDetails | null> {
  const supabase = createClient()

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*)
    `)
    .eq("id", id)
    .single()

  if (postError || !post) {
    console.error("Error fetching post:", postError)
    return null
  }

  // Get likes count
  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("post_id, user_id")
    .eq("post_id", id)

  if (likesError) {
    console.error("Error fetching likes:", likesError)
  }

  // Get comments
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select(`
      *,
      author:profiles!comments_author_id_fkey(*)
    `)
    .eq("post_id", id)
    .order("created_at", { ascending: true })

  if (commentsError) {
    console.error("Error fetching comments:", commentsError)
  }

  return {
    ...post,
    author: (post as PostWithAuthorJoin).author,
    likes_count: likes?.length || 0,
    comments: comments?.map((comment: { id: string; description: string; created_at: string; post_id: string; author_id: string; author: { id: string; first_name: string; last_name: string; image_url: string | null; github_url: string; affiliation: string | null; headline: string | null } }) => ({
      id: comment.id,
      description: comment.description,
      created_at: comment.created_at,
      post_id: comment.post_id,
      author_id: comment.author_id,
      updated_at: comment.created_at, // Use created_at as updated_at for comments
      author: comment.author
    })) || [],
    is_liked: false // TODO: Implement user-specific like checking
  }
}

export async function createPost(
  description: string,
  authorId: string,
  imageUrl?: string | null,
  videoUrl?: string | null,
  type: string = 'post'
): Promise<PostData | null> {
  const supabase = createClient()

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      description,
      author_id: authorId,
      image_url: imageUrl,
      video_url: videoUrl,
      type
    })
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*)
    `)
    .single()

  if (error) {
    console.error("Error creating post:", error)
    return null
  }

  // Transform the created post to PostData format
  const postWithAuthor = post as PostWithAuthorJoin
  const postData: PostData = {
    id: postWithAuthor.id,
    description: postWithAuthor.description,
    image_url: postWithAuthor.image_url,
    video_url: postWithAuthor.video_url,
    author: {
      full_name: `${postWithAuthor.author.first_name} ${postWithAuthor.author.last_name}`,
      tagline: postWithAuthor.author.headline || '',
      affiliation: postWithAuthor.author.affiliation,
      profile_picture_url: postWithAuthor.author.image_url,
      profile_url: `/app/users/${postWithAuthor.author.id}`
    },
    created_at: postWithAuthor.created_at,
    updated_at: postWithAuthor.updated_at,
    likes_count: 0,
    type: postWithAuthor.type,
    comments: [],
    is_liked: false
  }

  return postData
}

export async function getUserPosts(userId: string, limit: number = 20, offset: number = 0, currentUserId?: string): Promise<PostData[]> {
  const supabase = createClient()

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*)
    `)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (postsError) {
    console.error("Error fetching user posts:", postsError)
    return []
  }

  if (!posts || posts.length === 0) {
    return []
  }

  // Get likes count and check if current user liked each post
  const postIds = posts.map(post => post.id)
  
  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("post_id, user_id")
    .in("post_id", postIds)

  if (likesError) {
    console.error("Error fetching likes:", likesError)
  }

  // Get comments for each post
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select(`
      *,
      author:profiles!comments_author_id_fkey(*)
    `)
    .in("post_id", postIds)
    .order("created_at", { ascending: true })

  if (commentsError) {
    console.error("Error fetching comments:", commentsError)
  }

  // Transform the data to match our PostWithDetails interface
  const postsWithDetails: PostWithDetails[] = posts.map((post: PostWithAuthorJoin) => {
    const postLikes = likes?.filter(like => like.post_id === post.id) || []
    const postComments = comments?.filter(comment => comment.post_id === post.id) || []
    const isLiked = currentUserId ? postLikes.some(like => like.user_id === currentUserId) : false
    
    return {
      ...post,
      author: post.author,
      likes_count: postLikes.length,
      comments: postComments.map((comment: { id: string; description: string; created_at: string; post_id: string; author_id: string; author: { id: string; first_name: string; last_name: string; image_url: string | null; github_url: string; affiliation: string | null; headline: string | null } }) => ({
        id: comment.id,
        description: comment.description,
        created_at: comment.created_at,
        post_id: comment.post_id,
        author_id: comment.author_id,
        updated_at: comment.created_at,
        author: comment.author
      })),
      is_liked: isLiked
    }
  })

  // Transform to PostData format
  return postsWithDetails.map(transformPostData)
}

export async function getFollowerCount(userId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from("follow")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId)

  if (error) {
    console.error("Error fetching follower count:", error)
    return 0
  }

  return count || 0
}

export async function getFollowingCount(userId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from("follow")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId)

  if (error) {
    console.error("Error fetching following count:", error)
    return 0
  }

  return count || 0
}

export async function getAllProfiles(limit: number = 50, offset: number = 0): Promise<Profile[]> {
  const supabase = createClient()

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching profiles:", error)
    return []
  }

  return profiles || []
}

export async function likePost(postId: string, userId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("likes")
    .insert({
      post_id: postId,
      user_id: userId
    })

  if (error) {
    console.error("Error liking post:", error)
    return false
  }

  return true
}

export async function unlikePost(postId: string, userId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId)

  if (error) {
    console.error("Error unliking post:", error)
    return false
  }

  return true
}

export async function getPostLikesCount(postId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId)

  if (error) {
    console.error("Error fetching likes count:", error)
    return 0
  }

  return count || 0
}

export async function isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single()

  if (error) {
    // If no like found, return false
    return false
  }

  return !!data
}

export async function getUserProjects(userId: string): Promise<Tables<"projects">[]> {
  const supabase = createClient()

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("started_at", { ascending: false })

  if (error) {
    console.error("Error fetching user projects:", error)
    return []
  }

  return projects || []
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return profile
}

export async function isFollowingUser(followerId: string, followingId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("follow")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single()

  if (error) {
    // If no follow relationship found, return false
    return false
  }

  return !!data
}

export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("follow")
    .insert({
      follower_id: followerId,
      following_id: followingId
    })

  if (error) {
    console.error("Error following user:", error)
    return false
  }

  return true
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("follow")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId)

  if (error) {
    console.error("Error unfollowing user:", error)
    return false
  }

  return true
}

export async function getUserPostsCount(userId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", userId)

  if (error) {
    console.error("Error fetching user posts count:", error)
    return 0
  }

  return count || 0
}
