"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Sorry, something went wrong.</p>
        <Button asChild className="mt-4">
          <Link href="/">Back to main</Link>
        </Button>
      </div>
    </div>
  )
}
