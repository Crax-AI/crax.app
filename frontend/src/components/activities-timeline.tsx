"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Commit, Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GitCommit, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityWithProfile extends Commit {
  profile: Profile
}

interface ActivitiesTimelineProps {
  className?: string
}

export function ActivitiesTimeline({ className }: ActivitiesTimelineProps) {
  const [activities, setActivities] = useState<ActivityWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const supabase = createClient()
        
        // Fetch recent commits with profile data
        const { data, error } = await supabase
          .from('commits')
          .select(`
            *,
            profile:profiles(*)
          `)
          .order('pushed_at', { ascending: false })
          .limit(20)

        if (error) {
          setError(error.message)
          return
        }

        setActivities(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()

    // Set up real-time subscription for new commits
    const supabase = createClient()
    const subscription = supabase
      .channel('commits_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commits'
        },
        (payload) => {
          // Fetch the new commit with profile data
          const fetchNewCommit = async () => {
            const { data, error } = await supabase
              .from('commits')
              .select(`
                *,
                profile:profiles(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (!error && data) {
              setActivities(prev => [data, ...prev.slice(0, 19)]) // Keep only 20 most recent
            }
          }
          fetchNewCommit()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h`
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d`
    }
  }

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + "..."
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Failed to load activities</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={activity.profile.image_url || undefined} />
              <AvatarFallback className="text-xs">
                {activity.profile.first_name?.[0]}{activity.profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 text-sm">
                <span className="font-medium text-foreground">
                  @{activity.profile.username}
                </span>
                <span className="text-muted-foreground">pushed a commit</span>
                <GitCommit className="w-3 h-3 text-muted-foreground" />
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {truncateMessage(activity.message)}
              </p>
              
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(activity.pushed_at)}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {activity.repository_name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
