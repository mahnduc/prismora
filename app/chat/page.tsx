"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Copy, User } from "lucide-react"
import { usePeerChat } from "@/hooks/usePeerChat"

export default function FullChatUI() {
  const { peerId, messages, connectToPeer, sendMessage } = usePeerChat()
  const [input, setInput] = useState<string>("")
  const [remoteId, setRemoteId] = useState<string>("")

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput("")
  }

  return (
    <div className="flex h-screen w-full bg-neutral-50 dark:bg-neutral-950 p-4 gap-4 transition-colors">

      <Card className="flex-1 flex flex-col shadow-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`px-4 py-2 rounded-lg max-w-[70%] text-sm ${
                  m.sender === "me" 
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" 
                  : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập tin nhắn..."
            className="focus-visible:ring-neutral-400"
          />
          <Button onClick={handleSend} variant="default" className="bg-neutral-900 hover:bg-neutral-800">
            <Send size={18} />
          </Button>
        </div>
      </Card>

      {/* Sidebar Thông tin */}
      <div className="w-80 space-y-4">
        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <CardHeader><CardTitle className="text-sm font-medium">ID Của bạn</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input readOnly value={peerId} className="font-mono text-xs" />
            <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(peerId)}>
              <Copy size={16} />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <CardHeader><CardTitle className="text-sm font-medium">Kết nối với đối phương</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Nhập ID..." onChange={(e) => setRemoteId(e.target.value)} />
            <Button className="w-full bg-neutral-900 hover:bg-neutral-800" onClick={() => connectToPeer(remoteId)}>
              <User className="mr-2" size={16} /> Kết nối ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}