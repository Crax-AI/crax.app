"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Users, User, Hammer } from "lucide-react"
import { UserProfile } from "@/components/user-profile"

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
    name: "Projects",
    href: "/app/projects",
    icon: Hammer,
  },
  {
    name: "Profile",
    href: "/app/profile",
    icon: User,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-16 sm:w-48 lg:w-64 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 sm:justify-start justify-center w-full">
          <Image
            src="/crax-logo-dark.png"
            alt="Crax"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md"
          />
          <h1 className="text-xl font-bold text-foreground hidden sm:block">Crax</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-1 sm:px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 sm:px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                "sm:justify-start justify-center",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
              title={item.name}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="hidden sm:block">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile Section */}
      <UserProfile />
    </div>
  )
}
