"use client"

import { useUserStore } from "@/store/profileStore";
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { User } from "lucide-react";

export default function Topbar() {
  const name = useUserStore((state) => state.nickname)
  const avatarUrl = useUserStore((state) => state.avatarUrl)
  const router = useRouter()

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between flex-shrink-0 z-50">
      <div
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity duration-200"
        onClick={() => router.push("/")}
      >
        <span className="font-extrabold tracking-wider text-sm uppercase text-primary">
          Prismora
        </span>
      </div>

      <Button
        variant="ghost"
        className="h-auto p-1 pr-3 rounded-full bg-muted/40 border border-border/50 hover:bg-muted hover:border-border transition-all duration-200"
        onClick={() => router.push("/me")}
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full border border-border/80 bg-background overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name || "User Avatar"}
                width={28}
                height={28}
                unoptimized
                className="object-cover h-full w-full hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <User className="h-3 w-3 text-muted-foreground animate-pulse" />
            )}
          </div>

          {name && (
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors select-none">
              {name}
            </span>
          )}
        </div>
      </Button>
    </header>
  )
}