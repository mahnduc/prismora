import { useState, useEffect, useRef } from "react"
import Peer, { DataConnection } from "peerjs"

export function usePeerChat() {
  const [peerId, setPeerId] = useState<string>("")
  const [connection, setConnection] = useState<DataConnection | null>(null)
  const [messages, setMessages] = useState<{ sender: string, text: string }[]>([])
  const peerRef = useRef<Peer | null>(null)

  useEffect(() => {
    const newPeer = new Peer()
		console.log("[usePeerChat]: Khởi tạo peer")
    peerRef.current = newPeer

    newPeer.on("open", (id) => setPeerId(id))
    
    newPeer.on("connection", (c) => {
      setConnection(c)
      c.on("data", (data) => {
        setMessages((prev) => [...prev, { sender: "peer", text: String(data) }])
      })
    })

    return () => { 
      console.log("[usePeerChat]: Hủy peer")
      newPeer.destroy() 
    }
  }, [])

  // Hàm kết nối tới đối phương
  const connectToPeer = (remoteId: string) => {
    if (!peerRef.current || !remoteId) return
    const c = peerRef.current.connect(remoteId)
    setConnection(c)
    c.on("data", (data) => {
      setMessages((prev) => [...prev, { sender: "peer", text: String(data) }])
    })
  }

  // Hàm gửi tin nhắn
  const sendMessage = (text: string) => {
    if (connection) {
      connection.send(text)
      setMessages((prev) => [...prev, { sender: "me", text }])
    }
  }

  return { peerId, connection, messages, connectToPeer, sendMessage }
}