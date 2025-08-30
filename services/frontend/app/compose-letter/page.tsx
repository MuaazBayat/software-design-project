"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ComposeLetterRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to default compose page
    router.replace('/compose-letter/default')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">📝</div>
        <h1 className="text-2xl font-bold text-amber-800 mb-4">Loading Compose Page...</h1>
        <p className="text-amber-600">Setting up your letter writing experience.</p>
      </div>
    </div>
  )
}