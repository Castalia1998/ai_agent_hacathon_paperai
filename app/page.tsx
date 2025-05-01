"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Header } from "@/components/header"
import { ChatSidebar } from "@/components/chat-sidebar"
import { TextEditor } from "@/components/text-editor"
import { ProductList } from "@/components/product-list"
import { PaperContext } from "@/lib/paper-context"
import { ChevronLeft, ChevronRight, MessageSquare, List } from "lucide-react"
import type { BackendPaper } from "@/lib/paper-api"

export default function Home() {
  const [panelSizes, setPanelSizes] = useState({ left: 30, right: 70 }) // Default percentages
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true)
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true)
  const [previousPanelSizes, setPreviousPanelSizes] = useState({ left: 30, right: 70 }) // Store previous sizes
  const [leftPanelMode, setLeftPanelMode] = useState<"assistant" | "papers">("assistant")

  const leftResizeRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [selectedPapers, setSelectedPapers] = useState<BackendPaper[]>([])

  // Handle mouse down on the left resize handle
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingLeft(true)
  }

  // Toggle left panel visibility
  const toggleLeftPanel = () => {
    if (isLeftPanelVisible) {
      // Store current sizes before hiding
      setPreviousPanelSizes({ ...panelSizes })

      // Hide left panel and adjust right panel
      setPanelSizes({
        left: 0,
        right: 100,
      })
    } else {
      // Restore left panel with previous size
      setPanelSizes({
        left: previousPanelSizes.left,
        right: 100 - previousPanelSizes.left,
      })
    }
    setIsLeftPanelVisible(!isLeftPanelVisible)
  }

  // Handle mouse move to resize panels
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width
      const mouseX = e.clientX - containerRect.left

      if (isResizingLeft) {
        // Calculate percentages for left resize (with limits)
        const leftPercentage = Math.min(Math.max((mouseX / containerWidth) * 100, 20), 50)
        const rightPercentage = 100 - leftPercentage

        setPanelSizes({
          left: leftPercentage,
          right: rightPercentage,
        })
      }
    }

    const handleMouseUp = () => {
      setIsResizingLeft(false)
    }

    if (isResizingLeft) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingLeft, panelSizes])

  return (
    <PaperContext.Provider value={{ selectedPapers, setSelectedPapers }}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div ref={containerRef} className="flex flex-1 relative">
          {/* Left panel - Research Assistant or Paper List */}
          <div
            className={`bg-white overflow-hidden transition-all duration-300 ${isLeftPanelVisible ? "" : "w-0 opacity-0"}`}
            style={{ width: `${panelSizes.left}%`, height: "calc(100vh - 48px)" }}
          >
            <div className="h-full overflow-auto custom-scrollbar">
              <div className="py-2 px-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={() => setLeftPanelMode("assistant")}
                    className={`flex items-center gap-2 py-1 px-3 rounded-md transition-colors ${
                      leftPanelMode === "assistant"
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Research Assistant</span>
                  </button>
                  <button
                    onClick={() => setLeftPanelMode("papers")}
                    className={`flex items-center gap-2 py-1 px-3 rounded-md transition-colors ${
                      leftPanelMode === "papers"
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span className="text-sm">Paper List</span>
                  </button>
                </div>
                <button
                  onClick={toggleLeftPanel}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  title="Hide panel"
                >
                  <div className="flex">
                    <ChevronLeft className="w-4 h-4" />
                    <ChevronLeft className="w-4 h-4 -ml-2" />
                  </div>
                </button>
              </div>
              {leftPanelMode === "assistant" ? <ChatSidebar /> : <ProductList />}
            </div>
          </div>

          {/* Left resize handle (only visible when left panel is visible) */}
          {isLeftPanelVisible && (
            <div
              ref={leftResizeRef}
              className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize active:bg-blue-600 transition-colors"
              onMouseDown={handleLeftMouseDown}
            />
          )}

          {/* Right panel - Text Editor */}
          <div
            className="bg-white overflow-hidden transition-all duration-300"
            style={{ width: `${panelSizes.right}%`, height: "calc(100vh - 48px)" }}
          >
            <div className="h-full overflow-auto custom-scrollbar">
              {!isLeftPanelVisible && (
                <div className="p-2 sticky top-0 bg-white z-10">
                  <button
                    onClick={toggleLeftPanel}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    title="Show assistant"
                  >
                    <div className="flex">
                      <ChevronRight className="w-4 h-4" />
                      <ChevronRight className="w-4 h-4 -ml-2" />
                    </div>
                  </button>
                </div>
              )}
              <TextEditor />
            </div>
          </div>
        </div>
      </div>
    </PaperContext.Provider>
  )
}
