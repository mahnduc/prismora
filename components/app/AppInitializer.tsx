"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUserStore } from "@/store/profileStore"

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const initializeUser = useUserStore((state) => state.initializeUser)
  const isInitialized = useUserStore((state) => state.isInitialized)
  const username = useUserStore((state) => state.username)
  
  const didInitialize = useRef(false)

  useEffect(() => {
    if (isInitialized || didInitialize.current) return

    didInitialize.current = true
    initializeUser(router.push)
  }, [isInitialized, initializeUser, router])

  useEffect(() => {
    if (isInitialized) {
      if (username && pathname === "/intro") {
        router.replace("/")
      }
    }
  }, [isInitialized, username, pathname, router])

  if (!isInitialized) {
    return null 
  }

  if (username && pathname === "/intro") {
    return null
  }

  return <>{children}</>
}