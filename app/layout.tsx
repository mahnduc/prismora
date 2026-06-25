"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/store/profileStore";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { AppInitializer } from "@/components/app/AppInitializer";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter();
  const pathname = usePathname();
  
  const isInitialized = useUserStore((state) => state.isInitialized);
  const username = useUserStore((state) => state.username);

  useEffect(() => {
    if (!isInitialized) return;

    if (!username && !pathname.startsWith("/intro")) {
      router.replace("/intro");
    } else if (username && pathname.startsWith("/intro")) {
      router.replace("/");
    }
  }, [isInitialized, username, pathname, router]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <AppInitializer>
              {children}
            </AppInitializer>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}