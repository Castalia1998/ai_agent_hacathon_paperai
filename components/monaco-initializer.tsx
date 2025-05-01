"use client"

import { useEffect } from "react"
import { setupMonacoEnvironment } from "@/lib/monaco-config"

export function MonacoInitializer() {
  useEffect(() => {
    // 在客户端初始化 Monaco 环境
    setupMonacoEnvironment()
    console.log("Monaco environment initialized")

    // Verify that the Monaco environment is properly set up
    if (typeof window !== "undefined" && window.MonacoEnvironment) {
      console.log("Monaco environment successfully configured")
    } else {
      console.warn("Monaco environment not properly configured")
    }
  }, [])

  // 这个组件不渲染任何内容
  return null
}
