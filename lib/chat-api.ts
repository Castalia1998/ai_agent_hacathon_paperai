// Simple API client for chat communication
import { BACKEND_URL, AUTH_HEADERS } from "@/lib/config"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatResponse {
  message: ChatMessage
  error?: string
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  try {
    console.log(`Sending chat message to: ${BACKEND_URL}/chat`)

    // Check if BACKEND_URL is properly set
    if (!BACKEND_URL || BACKEND_URL === "") {
      console.error("BACKEND_URL is not set or empty")
      return createFallbackResponse(message, "Backend URL is not configured")
    }

    // Format the request according to the backend's expected format
    const requestBody = {
      message: message.trim(),
    }

    console.log("Chat request body:", requestBody)

    // Add a timeout to the fetch request - Increased from 30 to 45 seconds
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout for chat

    // Send request to the backend
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: AUTH_HEADERS, // Use the AUTH_HEADERS constant
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    console.log("Chat response status:", response.status)

    if (!response.ok) {
      // If we get a 404, it means the endpoint doesn't exist
      if (response.status === 404) {
        console.warn("Chat endpoint not found, using fallback mock response")
        // Return a mock response instead of throwing an error
        return createFallbackResponse(message)
      }

      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    // Parse the response from the backend
    const data = await response.json()
    console.log("Chat response data:", data)

    // Format the response according to our frontend's expected format
    return {
      message: {
        id: data.id || Date.now().toString(),
        role: "assistant",
        content: data.content || "",
        timestamp: new Date(),
      },
    }
  } catch (error) {
    // Check for specific error types
    if (error instanceof TypeError) {
      console.error("Network error sending chat message:", error)
    } else if (error.name === "AbortError") {
      console.error("Chat request timed out")
    } else {
      console.error("Error sending chat message:", error)
    }

    // Instead of propagating the error, return a fallback response
    return createFallbackResponse(message, error instanceof Error ? error.message : "Unknown error")
  }
}

function createFallbackResponse(userMessage: string, errorDetails?: string): ChatResponse {
  const errorPrefix = errorDetails ? `Error: ${errorDetails}. ` : ""

  return {
    message: {
      id: Date.now().toString(),
      role: "assistant",
      content: `${errorPrefix}I'm currently having trouble connecting to the backend server. Here's a simulated response instead.\n\nI'd be happy to help with your research or answer questions about your papers. What specific information are you looking for?`,
      timestamp: new Date(),
    },
    error: errorDetails,
  }
}
