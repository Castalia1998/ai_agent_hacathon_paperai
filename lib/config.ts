// Application configuration

// Get the backend URL from environment variables or use a default
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://159b-122-97-157-109.ngrok-free.app"

// Log the backend URL on startup
console.log("Using backend URL:", BACKEND_URL)

// Authentication headers for all API requests
export const AUTH_HEADERS = {
  "Content-Type": "application/json",
  "X-User-Token": "secret123",
  "ngrok-skip-browser-warning": "true", // Keep this for ngrok
}

// Other configuration options can be added here
export const CONFIG = {
  apiUrl: BACKEND_URL,
  maxMessageLength: 2000,
  defaultLanguage: "en",
}

// Function to check if the backend is available
export async function checkBackendAvailability(): Promise<boolean> {
  try {
    // Use the /ping endpoint for a lightweight availability check
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    const response = await fetch(`${BACKEND_URL}/ping`, {
      method: "GET",
      headers: AUTH_HEADERS,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`Backend ping failed with status: ${response.status}`)
      return false
    }

    // 验证响应内容
    try {
      const data = await response.json()
      if (data && data.status === "pong") {
        console.log("Backend ping successful: received 'pong' response")
        return true
      } else {
        console.warn("Backend ping returned unexpected response:", data)
        return false
      }
    } catch (parseError) {
      console.warn("Failed to parse ping response:", parseError)
      return false
    }
  } catch (error) {
    console.warn("Backend availability check failed:", error)
    return false
  }
}
