/**
 * SSE 流处理工具
 * 用于处理 Server-Sent Events 流式响应
 */

import { extractContentFromSSE } from "./sse-parser"

interface SSEStreamOptions {
  onChunk: (content: string) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

/**
 * 处理 SSE 流式响应
 * @param reader ReadableStreamDefaultReader 从 fetch 响应中获取
 * @param options 处理选项
 */
export async function handleSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: SSEStreamOptions,
): Promise<void> {
  const { onChunk, onError, onComplete } = options
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      let result
      try {
        result = await reader.read()
      } catch (readError) {
        // 处理读取错误，通常是因为流被中断
        console.warn("SSE stream read error:", readError)
        if (
          readError.name === "AbortError" ||
          readError.message?.includes("aborted") ||
          readError.message?.includes("abort")
        ) {
          // 这是一个预期的中断，可能是用户取消了请求
          throw new Error("Stream was aborted", { cause: readError })
        }
        throw readError
      }

      const { done, value } = result

      if (done) {
        // 处理缓冲区中的最后一部分数据
        if (buffer) {
          try {
            const content = extractContentFromSSE(buffer)
            if (content) {
              onChunk(content)
            }
          } catch (error) {
            console.error("Error processing final SSE buffer:", error)
          }
        }

        onComplete?.()
        break
      }

      // 解码二进制数据
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // 处理完整的消息
      const messages = buffer.split("\n\n")
      // 保留最后一个可能不完整的消息
      buffer = messages.pop() || ""

      for (const message of messages) {
        if (message.trim() && message.startsWith("data: ")) {
          try {
            const content = extractContentFromSSE(message)
            if (content) {
              onChunk(content)
            }
          } catch (error) {
            console.error("Error processing SSE chunk:", error)
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in SSE stream handling:", error)

    // 检查是否是流中断错误
    const isAbortError =
      error.name === "AbortError" ||
      error.message?.includes("aborted") ||
      error.message?.includes("abort") ||
      error.message?.includes("BodyStreamBuffer was aborted")

    if (isAbortError) {
      console.log("SSE stream was aborted, this may be intentional")
      // 如果是用户主动取消，可以不调用错误回调
      if (error.message !== "Stream was aborted") {
        onError?.(new Error("Stream connection was interrupted", { cause: error }))
      }
    } else {
      onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  } finally {
    // 确保我们总是尝试关闭流，即使出现错误
    try {
      await reader.cancel()
    } catch (cancelError) {
      console.warn("Error cancelling stream reader:", cancelError)
    }
  }
}

/**
 * 创建 SSE 请求并处理响应
 * @param url 请求URL
 * @param options 请求选项
 * @param streamOptions 流处理选项
 */
export async function fetchSSE(url: string, options: RequestInit, streamOptions: SSEStreamOptions): Promise<void> {
  let response = null
  let reader = null

  try {
    // 确保设置了正确的 Accept 头
    const headers = new Headers(options.headers || {})
    headers.set("Accept", "text/event-stream")

    response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error("Response body is null")
    }

    reader = response.body.getReader()
    await handleSSEStream(reader, streamOptions)
  } catch (error) {
    console.error("Error in fetchSSE:", error)

    // 检查是否是用户取消的请求
    const isUserCancelled = error.message === "Stream was aborted"

    if (!isUserCancelled) {
      streamOptions.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  } finally {
    // 确保我们总是尝试关闭流，即使出现错误
    if (reader) {
      try {
        await reader.cancel()
      } catch (cancelError) {
        console.warn("Error cancelling stream reader in fetchSSE:", cancelError)
      }
    }
  }
}
