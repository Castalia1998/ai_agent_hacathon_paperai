/**
 * SSE (Server-Sent Events) 解析工具
 */

// 解析 SSE 消息
export function parseSSEMessage(data: string): string[] {
  const messages: string[] = []
  const lines = data.split("\n\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith("data: ")) {
      // 提取 'data: ' 后面的内容
      const content = line.substring(6).trim()
      if (content) {
        messages.push(content)
      }
    }
  }

  return messages
}

// 处理流数据，提取 FINAL ANSWER 部分
export function processStreamData(text: string): string {
  // 查找 FINAL ANSWER 部分
  const finalAnswerMatch = text.match(/\*\*FINAL ANSWER\*\*([\s\S]*?)(?=\n\n|$)/)
  if (finalAnswerMatch) {
    return finalAnswerMatch[1].trim()
  }
  // 如果没有 FINAL ANSWER，返回原文本
  return text.trim()
}

// 尝试将消息解析为 JSON，如果失败则返回原始文本
export function tryParseJSON(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return { content: text }
  }
}

// 从 SSE 响应中提取内容
export function extractContentFromSSE(sseData: string): string {
  // 添加调试日志
  console.log("Received SSE data:", sseData.substring(0, 100) + (sseData.length > 100 ? "..." : ""))

  const messages = parseSSEMessage(sseData)
  let content = ""

  for (const message of messages) {
    try {
      // 首先尝试处理流数据，提取 FINAL ANSWER
      const processedContent = processStreamData(message)
      content += processedContent
    } catch (error) {
      console.warn("Error processing SSE message:", error)
      content += message // 解析失败时使用原始消息
    }
  }

  return content
}
