"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Paperclip, File, AlertCircle, RefreshCw, Clock, CheckCircle, XCircle, Send } from "lucide-react"
import { BACKEND_URL, AUTH_HEADERS, checkBackendAvailability } from "@/lib/config"
import { uploadPdf } from "@/lib/file-upload"
import ReactMarkdown from "react-markdown"

// 消息状态类型
type MessageStatus = "sending" | "sent" | "error" | "pending" | "typing"

// 消息类型定义
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  status?: MessageStatus
  isStreaming?: boolean
  retryCount?: number
  attachments?: {
    type: string
    name: string
    id?: string
    status?: "uploading" | "success" | "error"
    progress?: number
    error?: string
    info?: any
  }[]
}

// 消息队列项
interface MessageQueueItem {
  message: string
  attachments?: File[]
  retryCount: number
}

export function ChatSidebar() {
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your research assistant. I can help answer questions about your papers or provide information on various topics. How can I assist you today?",
      timestamp: new Date(),
      status: "sent",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [messageQueue, setMessageQueue] = useState<MessageQueueItem[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  // 处理消息队列
  useEffect(() => {
    const processQueue = async () => {
      if (messageQueue.length > 0 && !isProcessingQueue) {
        setIsProcessingQueue(true)
        const { message, attachments, retryCount } = messageQueue[0]

        try {
          // 如果有附件，先上传
          if (attachments && attachments.length > 0) {
            for (const file of attachments) {
              await handleFileUploadInternal(file)
            }
          }

          // 发送消息
          await sendMessageToBackend(message, retryCount)

          // 移除已处理的消息
          setMessageQueue((prev) => prev.slice(1))
        } catch (error) {
          console.error("Error processing message queue:", error)

          // 如果重试次数小于3，增加重试计数并保留在队列中
          if (retryCount < 3) {
            setMessageQueue((prev) => [{ ...prev[0], retryCount: retryCount + 1 }, ...prev.slice(1)])
          } else {
            // 超过重试次数，移除消息并显示错误
            setMessageQueue((prev) => prev.slice(1))
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "assistant",
                content: "Failed to send message after multiple attempts. Please try again later.",
                timestamp: new Date(),
                status: "error",
              },
            ])
          }
        } finally {
          setIsProcessingQueue(false)
        }
      }
    }

    processQueue()
  }, [messageQueue, isProcessingQueue])

  // 发送消息到后端
  const sendMessageToBackend = async (userInput: string, retryCount = 0) => {
    // 创建用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
      status: "sent",
    }

    // 添加用户消息到聊天
    setMessages((prev) => [...prev, userMessage])

    // 创建助手消息（初始为加载状态）
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      status: "typing",
      isStreaming: true,
    }

    // 添加助手消息到聊天
    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(true)

    try {
      // Check if BACKEND_URL is properly configured
      if (!BACKEND_URL || BACKEND_URL === "") {
        throw new Error("Backend URL is not configured")
      }

      // Prepare request body
      const requestBody = {
        message: userInput.trim(),
      }

      console.log("Sending chat message:", requestBody)
      console.log("Backend URL:", BACKEND_URL)

      // Send the request to the backend
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Check content type and parse response accordingly
      const contentType = response.headers.get("content-type") || ""
      let responseContent = "No response content"

      if (contentType.includes("application/json")) {
        // Handle JSON response
        const data = await response.json()
        console.log("Chat response (JSON):", data)
        responseContent = data.content || "No response content"
      } else {
        // Handle text response
        const text = await response.text()
        console.log("Chat response (Text):", text)
        responseContent = text || "No response content"
      }

      // Update the assistant message with the response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: responseContent, status: "sent", isStreaming: false }
            : msg,
        ),
      )
    } catch (error) {
      console.error("Error in sendMessageToBackend:", error)

      // Update message status to error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `I'm having trouble connecting to the server. Please check your internet connection and try again later.`,
                status: "error",
                isStreaming: false,
              }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Generate a fallback response when the backend is unavailable
  const generateFallbackResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()

    // Simple pattern matching for common questions
    if (input.includes("hello") || input.includes("hi ") || input.includes("hey")) {
      return "Hello! I'm operating in offline mode due to connection issues, but I can still help with basic information. How can I assist you today?"
    }

    if (input.includes("help") || input.includes("what can you do")) {
      return "I can help you analyze papers, answer research questions, and provide writing assistance. However, I'm currently in offline mode due to connection issues, so my capabilities are limited."
    }

    if (input.includes("paper") || input.includes("research") || input.includes("study")) {
      return "I'd be happy to help with your research or paper. Normally, I could analyze specific papers or help with research questions, but I'm currently operating in offline mode due to connection issues. Please try again later when the connection is restored."
    }

    // Default fallback response
    return "I'm currently having trouble connecting to the backend server. I'm operating in offline mode with limited capabilities. Please check your internet connection and try again later, or continue with basic questions that don't require backend processing."
  }

  // 内部文件上传处理
  const handleFileUploadInternal = async (file: File) => {
    if (!file) return null

    setIsUploading(true)

    // 创建消息ID
    const messageId = Date.now().toString()

    // 创建带附件的消息
    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: `Uploading PDF: ${file.name}`,
      timestamp: new Date(),
      attachments: [
        {
          type: "pdf",
          name: file.name,
          status: "uploading",
          progress: 0,
        },
      ],
    }

    // 添加消息
    setMessages((prev) => [...prev, userMessage])

    try {
      // 上传文件并跟踪进度
      const response = await uploadPdf(file, (progress) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.attachments?.[0]) {
              return {
                ...msg,
                attachments: [
                  {
                    ...msg.attachments[0],
                    progress,
                  },
                ],
              }
            }
            return msg
          }),
        )
      })

      // 更新消息状态
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            if (response.success) {
              return {
                ...msg,
                content: `Uploaded PDF: ${file.name}`,
                attachments: [
                  {
                    type: "pdf",
                    name: file.name,
                    id: response.file_id,
                    status: "success",
                    progress: 100,
                    info: response.parsed_info,
                  },
                ],
              }
            } else {
              return {
                ...msg,
                content: `Failed to upload PDF: ${file.name}`,
                attachments: [
                  {
                    type: "pdf",
                    name: file.name,
                    status: "error",
                    progress: 100,
                    error: response.error,
                  },
                ],
              }
            }
          }
          return msg
        }),
      )

      // 如果上传成功，返回文件ID
      if (response.success) {
        return response.file_id
      }

      return null
    } catch (error) {
      console.error("Error uploading file:", error)

      // 更新消息状态为错误
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              content: `Failed to upload PDF: ${file.name}`,
              attachments: [
                {
                  type: "pdf",
                  name: file.name,
                  status: "error",
                  progress: 100,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
              ],
            }
          }
          return msg
        }),
      )

      return null
    } finally {
      setIsUploading(false)
    }
  }

  // 文件上传处理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 重置文件输入
    e.target.value = ""

    // 上传文件
    const fileId = await handleFileUploadInternal(file)

    // 如果上传成功，添加分析请求到队列
    if (fileId) {
      setMessageQueue((prev) => [
        ...prev,
        {
          message: `Please analyze the PDF I just uploaded (${file.name})`,
          retryCount: 0,
        },
      ])
    }
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    // 清空输入框
    const userInput = inputValue
    setInputValue("")
    setIsInputFocused(false)

    // 将消息添加到队列中
    setMessageQueue((prev) => [...prev, { message: userInput, retryCount: 0 }])
  }

  // 重新发送消息
  const handleResendMessage = (messageId: string) => {
    const messageToResend = messages.find((msg) => msg.id === messageId)
    if (messageToResend && messageToResend.role === "user") {
      setMessageQueue((prev) => [...prev, { message: messageToResend.content, retryCount: 0 }])
    }
  }

  // 点击附件按钮
  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // 渲染消息状态图标
  const renderStatusIcon = (status?: MessageStatus) => {
    switch (status) {
      case "sending":
        return <Clock className="w-3 h-3 text-gray-400" />
      case "sent":
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case "error":
        return <XCircle className="w-3 h-3 text-red-500" />
      case "typing":
        return <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  // 自定义代码块组件
  const CodeBlock = ({ language, children }: { language: string; children: React.ReactNode }) => {
    return (
      <div className="bg-gray-800 rounded-md my-2 overflow-x-auto">
        <div className="px-4 py-1 text-xs text-gray-400 bg-gray-900 border-b border-gray-700">{language || "code"}</div>
        <pre className="p-4 text-sm text-gray-100 overflow-x-auto">
          <code>{children}</code>
        </pre>
      </div>
    )
  }

  // Check backend availability on component mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const isAvailable = await checkBackendAvailability()
        setIsBackendAvailable(isAvailable)
        console.log("Backend availability:", isAvailable ? "Available" : "Unavailable")
      } catch (error) {
        console.error("Error checking backend availability:", error)
        setIsBackendAvailable(false)
      }
    }

    checkAvailability()

    // Set up periodic checks
    const intervalId = setInterval(checkAvailability, 60000) // Check every minute

    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef}>
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`mb-6 animate-fadeIn ${message.isStreaming ? "animate-pulse" : ""}`}>
              {message.role === "assistant" ? (
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-blue-600">Research Assistant</span>
                      <span className="mx-2 text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                    </div>
                    <div className="flex items-center">{renderStatusIcon(message.status)}</div>
                  </div>
                  <div className="markdown-content">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "")
                          return !inline && match ? (
                            <CodeBlock language={match[1]}>{String(children).replace(/\n$/, "")}</CodeBlock>
                          ) : (
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          )
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  {message.status === "error" && (
                    <div className="mt-1 flex justify-end">
                      <button
                        onClick={() => handleResendMessage(message.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 flex-shrink-0 mt-0.5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs">
                    U
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="text-xs font-medium">You</span>
                        <span className="mx-2 text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                      </div>
                      <div className="flex items-center">{renderStatusIcon(message.status)}</div>
                    </div>
                    <div className="text-sm">{message.content}</div>

                    {/* 渲染附件 */}
                    {message.attachments?.map((attachment, index) => (
                      <div key={index} className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200 text-xs">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{attachment.name}</span>
                        </div>

                        {/* 上传进度条 */}
                        {attachment.status === "uploading" && (
                          <div className="mt-2">
                            <div className="w-full h-1.5 bg-gray-200 rounded-full">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${attachment.progress || 0}%` }}
                              ></div>
                            </div>
                            <div className="text-right mt-1 text-gray-500">{attachment.progress || 0}%</div>
                          </div>
                        )}

                        {/* 错误消息 */}
                        {attachment.status === "error" && (
                          <div className="mt-2 flex items-start gap-1 text-red-500">
                            <AlertCircle className="w-3 h-3 mt-0.5" />
                            <span>{attachment.error || "Upload failed"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 加载指示器 */}
          {isLoading && !messages[messages.length - 1]?.isStreaming && (
            <div className="flex gap-3">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => !inputValue && setIsInputFocused(false)}
            placeholder="Chat about your paper or get drafting help"
            className="w-full border border-gray-200 rounded-md py-2 px-4 pr-16 text-sm focus:outline-none resize-none overflow-hidden"
            rows={1}
            style={{ minHeight: "2.5rem" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={isLoading || isUploading}
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            {/* 隐藏的文件输入 */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isLoading || isUploading}
            />

            {/* 附件按钮 */}
            <button
              className={`text-gray-400 hover:text-gray-600 ${isUploading ? "opacity-50" : ""}`}
              onClick={handleAttachmentClick}
              disabled={isLoading || isUploading}
              title="Upload PDF"
            >
              <Paperclip className={`w-4 h-4 ${isUploading ? "animate-pulse" : ""}`} />
            </button>

            {/* 发送按钮 */}
            <button
              className={`${
                inputValue && !isLoading && !isUploading ? "bg-blue-600 text-white" : "text-gray-400"
              } w-6 h-6 flex items-center justify-center rounded-full transition-colors`}
              onClick={handleSendMessage}
              disabled={!inputValue || isLoading || isUploading}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 底部工具栏 */}
        <div className="flex justify-end mt-2 text-xs text-gray-500">
          <div>
            {messageQueue.length > 0 && (
              <span className="text-blue-500">{messageQueue.length} message(s) in queue</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
