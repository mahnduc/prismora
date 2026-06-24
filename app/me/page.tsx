"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useUserStore } from "@/store/profileStore"
import Topbar from "@/components/common/Topbar"

const OPFS_FILE_NAME = "info.json"

export default function Profile() {
  const router = useRouter()

  const username = useUserStore((state) => state.username)
  const tag = useUserStore((state) => state.tag)
  const nickname = useUserStore((state) => state.nickname)
  const avatarUrl = useUserStore((state) => state.avatarUrl)
  const isInitialized = useUserStore((state) => state.isInitialized)
  const clearUserStore = useUserStore((state) => state.clearUser)

  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportBackup = async () => {
    setIsExporting(true)
    try {
      const root = await navigator.storage.getDirectory()
      const fileHandle = await root.getFileHandle(OPFS_FILE_NAME)
      const file = await fileHandle.getFile()
      const text = await file.text()

      const blob = new Blob([text], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const safeUsername = username.toLowerCase().replace(/\s+/g, "-")
      a.download = `prismora-backup-${safeUsername}.json`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Xuất file cấu hình danh tính sao lưu thành công!")
    } catch (err) {
      toast.error("Không tìm thấy dữ liệu cấu hình hợp lệ để xuất.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearIdentity = async () => {
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa danh tính này không? Hành động này sẽ hủy toàn bộ tệp cấu hình cục bộ."
    )
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const root = await navigator.storage.getDirectory()
      await root.removeEntry(OPFS_FILE_NAME)

      clearUserStore()
      toast.success("Đã xóa hoàn toàn danh tính cục bộ thành công.")
      router.replace("/intro")
    } catch (err) {
      toast.error("Lỗi hệ thống: Không thể xóa tệp cấu hình sandbox.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isInitialized || !username) return null

  const displayName = nickname || username

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground font-sans antialiased">
      <Topbar />

      <div className="flex-1 max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 p-6 md:p-12 items-start">

        <div className="rounded-xl border bg-card p-6 flex flex-col items-center text-center space-y-4 shadow-sm">

          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-primary/20 bg-background flex items-center justify-center shadow-inner">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-1.5 w-full">
            <h2 className="text-lg font-bold tracking-tight text-foreground truncate px-1">
              {displayName}
            </h2>
            {tag && (
              <p className="text-xs font-mono text-muted-foreground/80 mb-2">
                @{username}<span className="text-primary">{tag}</span>
              </p>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Các hành động nâng cao */}
        <div className="space-y-8 pt-2">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                variant="outline"
                className="text-xs gap-2 h-9 px-4 rounded-lg bg-card hover:bg-muted"
                onClick={handleExportBackup}
                disabled={isExporting || isDeleting}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                {isExporting ? "Đang trích xuất..." : "Sao lưu cấu hình JSON"}
              </Button>

              <Button
                variant="destructive"
                className="text-xs gap-2 h-9 px-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all"
                onClick={handleClearIdentity}
                disabled={isExporting || isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Đang gỡ bỏ..." : "Xóa danh tính cục bộ"}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/60 font-mono leading-relaxed max-w-md pt-2">
              * Hệ thống hoạt động hoàn toàn ở môi trường local. Việc xóa danh tính sẽ xóa sạch bộ nhớ Sandbox của trình duyệt và không thể khôi phục trừ khi bạn có file dữ liệu sao lưu.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}