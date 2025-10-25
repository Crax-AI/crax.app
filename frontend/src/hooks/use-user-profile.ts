"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Tables } from "@/lib/supabase/database.types"
import { User } from "@supabase/supabase-js"

type Profile = Tables<"profiles">

interface UserProfile {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export function useUserProfile(): UserProfile {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getSessionAndProfile = async () => {
      try {
        const supabase = createClient()
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(sessionError.message)
          setLoading(false)
          return
        }

        if (!session?.user) {
          setLoading(false)
          return
        }

        setUser(session.user)

        // Query profile table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          setError(profileError.message)
        } else {
          setProfile(profileData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    getSessionAndProfile()
  }, [])

  return {
    user,
    profile,
    loading,
    error
  }
}
