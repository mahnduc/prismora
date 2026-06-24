"use client"

import { ChangeEvent, FormEvent, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, LogIn, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useUserStore } from "@/store/profileStore"

interface RestoredDataType {
  username: string
  tag: string
  nickname: string
  avatarUrl: string
  currentStyle: string
}

const OPFS_FILE_NAME = "info.json"

export default function Intro() {
  const setUserStore = useUserStore((state) => state.setUser)
  const isInitialized = useUserStore((state) => state.isInitialized)
  const usernameStore = useUserStore((state) => state.username)
  const router = useRouter()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [username, setUsername] = useState("")
  const [tag, setTag] = useState("#")
  const [nickname, setNickname] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [restoredData, setRestoredData] = useState<RestoredDataType | null>(null)

  useEffect(() => {
    if (isInitialized && usernameStore) {
      router.replace("/")
    }
  }, [isInitialized, usernameStore, router])

  const saveToOPFS = async (data: RestoredDataType) => {
    try {
      const root = await navigator.storage.getDirectory()
      const fileHandle = await root.getFileHandle(OPFS_FILE_NAME, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(data))
      await writable.close()
    } catch (e) {
      console.error("Lỗi OPFS:", e)
      toast.error("Không thể lưu dữ liệu vào hệ thống.")
    }
  }

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValue = rawValue
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9]/g, "");

    setUsername(sanitizedValue);
  }

  const handleTagChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith("#")) {
      value = "#" + value;
    }
    value = "#" + value.substring(1).replace(/#/g, "");
    setTag(value);
  }

  // Đọc file backup JSON
  const handleUploadBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        const parsedData: RestoredDataType = {
          username: json.username || json.name || "",
          tag: json.tag || "#",
          nickname: json.nickname || "",
          avatarUrl: json.avatarUrl || "",
          currentStyle: json.currentStyle || ""
        }

        setRestoredData(parsedData)
        setUsername(parsedData.username)
        setTag(parsedData.tag.startsWith("#") ? parsedData.tag : `#${parsedData.tag}`)
        setNickname(parsedData.nickname)

        toast.success("Đọc file khôi phục thành công! Hãy kiểm tra lại thông tin.")
      } catch (err) {
        console.log(err)
        toast.error("File JSON không hợp lệ hoặc bị hỏng.")
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
  }

  const handleCancelRestore = () => {
    setRestoredData(null)
    setUsername("")
    setTag("#")
    setNickname("")
    toast.info("Đã hủy trạng thái khôi phục.")
  }

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      return toast.error("Vui lòng nhập Tên đăng nhập.")
    }

    if (!nickname.trim()) {
      return toast.error("Vui lòng nhập Biệt danh.")
    }

    setIsSubmitting(true)

    let finalTag = tag.trim();
    if (finalTag === "#" || !finalTag) {
      finalTag = "#prismex";
    }
    
    const payload: RestoredDataType = { 
      username, 
      tag: finalTag, 
      nickname: nickname.trim(), 
      avatarUrl: restoredData?.avatarUrl || "", 
      currentStyle: restoredData?.currentStyle || "" 
    }

    try {
      setUserStore(payload.username, payload.tag, payload.nickname, payload.avatarUrl, payload.currentStyle)
      await saveToOPFS(payload)

      toast.success(restoredData ? "Khôi phục danh tính thành công!" : "Khởi tạo danh tính thành công!")
      router.push("/")
    } catch (err) {
      console.log(err)
      toast.error("Hệ thống gặp lỗi trong quá trình xử lý.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isInitialized && usernameStore) return null

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">

        {/* Input ẩn để xử lý upload file */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleUploadBackup}
          className="hidden"
          disabled={isSubmitting}
        />

        {/* Tiêu đề & Nút khôi phục file cấu hình */}
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
            {restoredData ? "Khôi phục danh tính" : "Danh tính cá nhân"}
          </h1>
          {restoredData ? (
            <Button type="button" variant="destructive" size="sm" onClick={handleCancelRestore} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1.5" /> Hủy nhập
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
              <Upload className="h-4 w-4 mr-1.5" /> Khôi phục
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* Tên đăng nhập */}
          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập <span className="text-destructive">*</span></Label>
            <Input
              id="username"
              type="text"
              maxLength={25}
              value={username}
              onChange={handleUsernameChange}
              placeholder="ex: prismora"
              disabled={isSubmitting || restoredData !== null}
              autoComplete="off"
            />
          </div>

          {/* Thẻ tên */}
          <div className="space-y-2">
            <Label htmlFor="tag">Thẻ tên</Label>
            <Input
              id="tag"
              maxLength={15}
              value={tag}
              onChange={handleTagChange}
              placeholder="#prismex"
              disabled={isSubmitting || restoredData !== null}
              autoComplete="off"
            />
          </div>

          {/* Biệt danh */}
          <div className="space-y-2">
            <Label htmlFor="nickname">Biệt danh <span className="text-destructive">*</span></Label>
            <Input
              id="nickname"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Tên hiển thị của bạn..."
              disabled={isSubmitting || restoredData !== null}
              autoComplete="off"
            />
          </div>

          <div className="pt-4">
            {restoredData ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 gap-2 font-medium text-md"
              >
                <LogIn className="h-5 w-5" />
                {isSubmitting ? <span>Đang khôi phục...</span> : <span>Xác nhận đăng nhập</span>}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 gap-2 font-medium text-md"
              >
                {isSubmitting ? <span>Đang khởi tạo...</span> : <span>Khởi tạo</span>}
              </Button>
            )}
          </div>
        </form>

      </div>
    </div>
  )
}