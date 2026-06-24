import { create } from "zustand"

interface ProfileStore {
  username: string
  tag: string
  nickname: string
  avatarUrl: string
  currentStyle: string
  isInitialized: boolean
  setUser: (username: string, tag: string, nickname: string, avatarUrl: string, currentStyle: string) => void
  clearUser: () => void
  initializeUser: (routerPush: (url: string) => void) => Promise<void>
}

export const useUserStore = create<ProfileStore>((set) => ({
  username: "",
  tag: "",
  nickname: "",
  avatarUrl: "",
  currentStyle: "",
  isInitialized: false,
  
  setUser: (username, tag, nickname, avatarUrl, currentStyle) => 
    set({ username, tag, nickname, avatarUrl, currentStyle }),
    
  clearUser: () => 
    set({ username: "", tag: "", nickname: "", avatarUrl: "", currentStyle: "" }),
  
  initializeUser: async (routerPush) => {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle("info.json", { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      
      if (text) {
        const data = JSON.parse(text);
        set({
          username: data.username || data.name || "", 
          tag: data.tag || "",
          nickname: data.nickname || "",
          avatarUrl: data.avatarUrl || "",
          currentStyle: data.currentStyle || "",
          isInitialized: true
        });
        return;
      }
      
      throw new Error("File rỗng");
    } catch (err) {
      console.log(err)
      set({ isInitialized: true });
      routerPush("/intro");
    }
  }
}))