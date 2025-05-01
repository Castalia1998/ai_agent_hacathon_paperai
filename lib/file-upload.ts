import { BACKEND_URL } from "@/lib/config"

interface UploadResponse {
  success: boolean
  message: string
  file_id?: string
  original_filename?: string
  parsed_info?: any
  error?: string
}

export async function uploadPdf(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
  try {
    console.log(`Uploading PDF to: ${BACKEND_URL}/upload_pdf`)

    // Check if BACKEND_URL is properly set
    if (!BACKEND_URL || BACKEND_URL === "") {
      console.error("BACKEND_URL is not set or empty")
      return {
        success: false,
        message: "Backend URL is not configured",
        error: "Backend URL is not configured",
      }
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return {
        success: false,
        message: "Only PDF files are supported.",
        error: "Invalid file type",
      }
    }

    // Create form data
    const formData = new FormData()
    formData.append("file", file)

    // Use XMLHttpRequest to track upload progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.open("POST", `${BACKEND_URL}/upload_pdf`, true)

      // Add authentication headers
      xhr.setRequestHeader("X-User-Token", "secret123")
      xhr.setRequestHeader("ngrok-skip-browser-warning", "true")

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            console.log("Upload response:", response)
            resolve({
              success: true,
              message: response.message || "PDF uploaded successfully",
              file_id: response.file_id,
              original_filename: response.original_filename,
              parsed_info: response.parsed_info,
            })
          } catch (e) {
            console.error("Error parsing upload response:", e)
            resolve({
              success: false,
              message: "Failed to parse server response",
              error: "Invalid server response",
            })
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText)
            console.error("Server error:", xhr.status, errorResponse)
            resolve({
              success: false,
              message: "Upload failed",
              error: errorResponse.error || `Server returned ${xhr.status}`,
            })
          } catch (e) {
            console.error("Error parsing error response:", e)
            resolve({
              success: false,
              message: "Upload failed",
              error: `Server returned ${xhr.status}`,
            })
          }
        }
      }

      xhr.onerror = (e) => {
        console.error("Network error during upload:", e)
        resolve({
          success: false,
          message: "Upload failed",
          error: "Network error",
        })
      }

      xhr.ontimeout = () => {
        console.error("Upload request timed out")
        resolve({
          success: false,
          message: "Upload failed",
          error: "Request timed out",
        })
      }

      // Set a timeout - Increased from 30 to 60 seconds for file uploads
      xhr.timeout = 300000 // 5 minutes

      xhr.send(formData)
    })
  } catch (error) {
    console.error("Error in uploadPdf:", error)
    return {
      success: false,
      message: "Upload failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
