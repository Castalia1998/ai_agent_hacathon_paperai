import { BACKEND_URL, AUTH_HEADERS } from "@/lib/config"

export interface TrashFile {
  file_id: string
  title: string
}

// Get list of files in the recycle bin
export async function fetchTrashFiles(): Promise<TrashFile[]> {
  try {
    console.log(`Fetching trash files from: ${BACKEND_URL}/list_trash_files`)

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    const response = await fetch(`${BACKEND_URL}/list_trash_files`, {
      method: "GET",
      headers: AUTH_HEADERS, // Use the AUTH_HEADERS constant
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Error fetching trash files: ${response.status} ${response.statusText}`)
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Trash files response:", data)
    return data.trash || [] // Changed from 'files' to 'trash' to match backend
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out fetching trash files")
    } else {
      console.error("Error fetching trash files:", error)
    }
    return []
  }
}

// Move selected files to recycle bin
export async function moveToTrash(fileIds: string[]): Promise<boolean> {
  try {
    console.log(`Moving files to trash: ${BACKEND_URL}/delete_pdfs`)
    console.log("File IDs:", fileIds)

    // Create the request body
    const requestBody = JSON.stringify({ file_ids: fileIds })
    console.log("Request body:", requestBody)

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    const response = await fetch(`${BACKEND_URL}/delete_pdfs`, {
      method: "POST",
      headers: AUTH_HEADERS, // Use the AUTH_HEADERS constant
      body: requestBody,
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Move to trash response:", data)

    return true
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out moving files to trash")
    } else {
      console.error("Error moving files to trash:", error)
    }
    // Re-throw the error to be handled by the caller
    throw error
  }
}

// Restore files from recycle bin
export async function restoreFiles(fileIds: string[]): Promise<boolean> {
  try {
    console.log(`Restoring files: ${BACKEND_URL}/restore_pdfs`)
    console.log("File IDs to restore:", fileIds)

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    const response = await fetch(`${BACKEND_URL}/restore_pdfs`, {
      method: "POST",
      headers: AUTH_HEADERS, // Use the AUTH_HEADERS constant
      body: JSON.stringify({ file_ids: fileIds }),
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Restore files response:", data)

    return true
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out restoring files")
    } else {
      console.error("Error restoring files:", error)
    }
    throw error
  }
}

// Permanently delete files from recycle bin
export async function permanentlyDeleteFiles(fileIds: string[]): Promise<boolean> {
  try {
    console.log(`Permanently deleting files: ${BACKEND_URL}/purge_pdfs`)
    console.log("File IDs to delete:", fileIds)

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    const response = await fetch(`${BACKEND_URL}/purge_pdfs`, {
      method: "DELETE",
      headers: AUTH_HEADERS, // Use the AUTH_HEADERS constant
      body: JSON.stringify({ file_ids: fileIds }),
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Permanently delete files response:", data)

    return true
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out permanently deleting files")
    } else {
      console.error("Error permanently deleting files:", error)
    }
    throw error
  }
}

// Download files as ZIP - direct stream instead of URL
export async function downloadFilesAsZip(fileIds: string[]): Promise<void> {
  try {
    console.log(`Downloading files as ZIP: ${BACKEND_URL}/download_pdfs_zip`)
    console.log("File IDs to download:", fileIds)

    // For download, we need to modify the Accept header but keep the auth token
    const downloadHeaders = {
      ...AUTH_HEADERS,
      Accept: "application/octet-stream",
    }

    // Add a timeout to the fetch request - longer for downloads
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout for downloads

    const response = await fetch(`${BACKEND_URL}/download_pdfs_zip`, {
      method: "POST",
      headers: downloadHeaders,
      body: JSON.stringify({ file_ids: fileIds }),
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    // Get the blob from the response
    const blob = await response.blob()
    console.log("Download response received, blob size:", blob.size)

    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob)

    // Create a temporary link and click it to start the download
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "selected_papers.zip")
    document.body.appendChild(link)
    link.click()

    // Clean up
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out downloading files")
    } else {
      console.error("Error downloading files:", error)
    }
    throw error
  }
}
