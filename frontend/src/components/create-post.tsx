"use client"

import { useState, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import Image from "next/image"
import { ImageIcon, VideoIcon, X, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { createPost as createPostDB } from "@/lib/supabase/posts"
import { useUserProfile } from "@/hooks/use-user-profile"
import { toast } from "sonner"

interface CreatePostProps {
  onPostCreated?: () => void
}

interface MediaFile {
  file: File
  preview: string
  type: 'image' | 'video'
}

interface MediaFiles {
  image: MediaFile | null
  video: MediaFile | null
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user, profile, loading: profileLoading } = useUserProfile()
  const [description, setDescription] = useState("")
  const [postType, setPostType] = useState<'post' | 'update' | 'insight' | 'launch'>('post')
  const [mediaFiles, setMediaFiles] = useState<MediaFiles>({
    image: null,
    video: null
  })
  const [isUploading, setIsUploading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, expectedType: 'image' | 'video') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type based on expected type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    
    if (expectedType === 'image' && !isImage) {
      toast.error('Please select an image file')
      return
    }
    
    if (expectedType === 'video' && !isVideo) {
      toast.error('Please select a video file')
      return
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB')
      return
    }

    // Create preview URL
    const preview = URL.createObjectURL(file)
    const mediaFile: MediaFile = {
      file,
      preview,
      type: expectedType
    }
    
    setMediaFiles(prev => ({
      ...prev,
      [expectedType]: mediaFile
    }))
  }

  const removeMedia = (type: 'image' | 'video') => {
    const mediaFile = mediaFiles[type]
    if (mediaFile?.preview) {
      URL.revokeObjectURL(mediaFile.preview)
    }
    setMediaFiles(prev => ({
      ...prev,
      [type]: null
    }))
    if (type === 'image' && imageInputRef.current) {
      imageInputRef.current.value = ''
    }
    if (type === 'video' && videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const removeAllMedia = () => {
    if (mediaFiles.image?.preview) {
      URL.revokeObjectURL(mediaFiles.image.preview)
    }
    if (mediaFiles.video?.preview) {
      URL.revokeObjectURL(mediaFiles.video.preview)
    }
    setMediaFiles({ image: null, video: null })
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const uploadToSupabase = async (file: File): Promise<string> => {
    const supabase = createClient()
    
    // Generate unique filename with UUID
    const fileExtension = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    
    // Determine folder based on file type
    const folder = file.type.startsWith('image/') ? 'images' : 'videos'
    const filePath = `${folder}/${fileName}`
    
    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const createPost = async () => {
    if (!description.trim() && !mediaFiles.image && !mediaFiles.video) {
      toast.error('Please add some content to your post')
      return
    }

    if (!user || !profile) {
      toast.error('Please log in to create a post')
      return
    }

    setIsPosting(true)

    try {
      let imageUrl: string | null = null
      let videoUrl: string | null = null

      // Upload media files if present
      if (mediaFiles.image || mediaFiles.video) {
        setIsUploading(true)
        
        if (mediaFiles.image) {
          imageUrl = await uploadToSupabase(mediaFiles.image.file)
        }
        
        if (mediaFiles.video) {
          videoUrl = await uploadToSupabase(mediaFiles.video.file)
        }
        
        setIsUploading(false)
      }

      // Create post in database
      const newPost = await createPostDB(
        description.trim(),
        user.id,
        imageUrl,
        videoUrl,
        postType
      )

      if (!newPost) {
        throw new Error('Failed to create post')
      }

      // Reset form
      setDescription("")
      removeAllMedia()
      
      // Show success toast
      toast.success('Post created successfully!')
      
      // Notify parent component
      onPostCreated?.()
      
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create post')
    } finally {
      setIsPosting(false)
      setIsUploading(false)
    }
  }

  const canPost = description.trim() || mediaFiles.image || mediaFiles.video
  const isDisabled = isPosting || isUploading || profileLoading

  if (profileLoading) {
    return (
      <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 bg-muted/30 rounded-lg">
      <Avatar className="h-10 w-10">
        <AvatarImage src={profile?.image_url || undefined} alt="Profile" />
        <AvatarFallback>
          {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What&apos;s happening? Share your idea, update, or anything else..."
          className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground"
          rows={3}
          disabled={isDisabled}
        />
        
        {/* Post Type Selector */}
        <div className="flex gap-1 mb-3">
          {[
            { value: 'post', label: 'Post', emoji: '📝' },
            { value: 'update', label: 'Progress update', emoji: '🚧' },
            { value: 'insight', label: 'Insight', emoji: '💡' },
            { value: 'launch', label: 'Launch', emoji: '🚀' }
          ].map((type) => (
            <Button
              key={type.value}
              variant={postType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPostType(type.value as 'post' | 'update' | 'insight' | 'launch')}
              disabled={isDisabled}
              className="flex items-center gap-1 px-2 py-1 h-7 text-xs"
            >
              <span className="text-xs">{type.emoji}</span>
              <span className="text-xs">{type.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Media Preview */}
        {(mediaFiles.image || mediaFiles.video) && (
          <div className="space-y-3 mb-3">
            {mediaFiles.image && (
              <div className="relative">
                <Image
                  src={mediaFiles.image.preview}
                  alt="Image preview"
                  width={500}
                  height={300}
                  className="rounded-lg w-full h-auto max-h-96 object-contain"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => removeMedia('image')}
                  disabled={isDisabled}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {mediaFiles.video && (
              <div className="relative">
                <video
                  src={mediaFiles.video.preview}
                  controls
                  className="rounded-lg w-full h-auto max-h-96"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => removeMedia('video')}
                  disabled={isDisabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
              className="hidden"
              disabled={isDisabled}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFileSelect(e, 'video')}
              className="hidden"
              disabled={isDisabled}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={isDisabled || !!mediaFiles.image}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={isDisabled || !!mediaFiles.video}
            >
              <VideoIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            size="sm"
            onClick={createPost}
            disabled={!canPost || isDisabled}
          >
            {isPosting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? 'Uploading...' : 'Posting...'}
              </>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
