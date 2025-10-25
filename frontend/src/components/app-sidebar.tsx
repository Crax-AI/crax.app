"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Users, User } from "lucide-react"
import { useUserProfile } from "@/hooks/use-user-profile"

const navigation = [
  {
    name: "Feed",
    href: "/app/feed",
    icon: Home,
  },
  {
    name: "People",
    href: "/app/people",
    icon: Users,
  },
  {
    name: "Profile",
    href: "/app/profile",
    icon: User,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, profile, loading } = useUserProfile()

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-foreground">Crax</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-border p-4">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 bg-muted animate-pulse rounded w-20" />
            </div>
          </div>
        ) : user && profile ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{user.email?.split('@')[0] || 'user'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Guest User
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Not signed in
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
