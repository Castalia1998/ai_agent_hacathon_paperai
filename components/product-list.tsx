"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowUpDown, Check, RefreshCw, AlertCircle, Download, Trash2, Trash } from "lucide-react"
import { fetchPaperList, fetchPaperStats, type BackendPaper } from "@/lib/paper-api"
import { moveToTrash, downloadFilesAsZip } from "@/lib/recycle-bin-api"
import { BACKEND_URL } from "@/lib/config"
import { usePaperContext } from "@/lib/paper-context"
import { RecycleBinModal } from "./recycle-bin-modal"

interface Paper {
  id: string
  title: string
  year: string
  keywords: string[]
  authors: string[]
  icon?: string
  abstract?: string
  originalData: BackendPaper
}

interface ProductListProps {
  toggleLeftPanel?: () => void
}

export function ProductList({ toggleLeftPanel }: ProductListProps) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingSampleData, setIsUsingSampleData] = useState(false)
  const [stats, setStats] = useState({ current: 0, total: 0 })
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { setSelectedPapers } = usePaperContext()

  // Function to convert backend paper format to frontend format
  const convertPaper = (backendPaper: BackendPaper): Paper => {
    // Parse authors string into array
    let authors: string[] = []
    if (backendPaper.authors) {
      // Split by common separators like commas, semicolons, and 'and'
      authors = backendPaper.authors
        .split(/,|;|\sand\s/)
        .map((author) => author.trim())
        .filter((author) => author.length > 0)
    }

    return {
      id: backendPaper.file_id,
      title: backendPaper.title || "Untitled Paper",
      year: backendPaper.year ? backendPaper.year.toString() : "Unknown",
      keywords: backendPaper.keywords || [],
      authors: authors.length > 0 ? authors : ["Unknown"],
      abstract: backendPaper.abstract || "",
      icon: "📄",
      originalData: backendPaper,
    }
  }

  const loadPapers = async () => {
    setIsLoading(true)
    setError(null)
    setIsUsingSampleData(false)

    try {
      // Check if the backend URL is properly configured
      if (!BACKEND_URL || BACKEND_URL === "") {
        throw new Error("Backend URL is not configured. Please check your environment variables.")
      }

      // Fetch papers from backend
      const backendPapers = await fetchPaperList()

      // Check if we're using sample data (based on the file_id pattern)
      const isSampleData = backendPapers.length > 0 && backendPapers[0].file_id.startsWith("sample")
      setIsUsingSampleData(isSampleData)

      if (isSampleData) {
        setError(`Could not connect to the backend API at ${BACKEND_URL}. Showing sample data instead.`)
      }

      // Convert to frontend format
      const convertedPapers = backendPapers.map(convertPaper)
      setPapers(convertedPapers)

      // Also fetch stats
      const statsData = await fetchPaperStats()
      setStats({
        current: statsData.current_file_count,
        total: statsData.total_uploaded,
      })
    } catch (err) {
      console.error("Failed to load papers:", err)

      // Provide a more detailed error message
      let errorMessage = "Failed to load papers. "

      if (err instanceof TypeError) {
        errorMessage += "Network error: Could not connect to the backend. "
      } else if (err.name === "AbortError") {
        errorMessage += "Request timed out. "
      } else if (err instanceof Error) {
        errorMessage += err.message + " "
      }

      errorMessage += "Please check the backend connection and console for details."

      setError(errorMessage)
      setIsUsingSampleData(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Load papers on component mount
  useEffect(() => {
    loadPapers()
  }, [])

  // Update selected papers in context when selection changes
  useEffect(() => {
    const selectedPapersData = papers
      .filter((paper) => selectedPaperIds.includes(paper.id))
      .map((paper) => paper.originalData)

    setSelectedPapers(selectedPapersData)
  }, [selectedPaperIds, papers, setSelectedPapers])

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPaperIds(papers.map((p) => p.id))
    } else {
      setSelectedPaperIds([])
    }
  }

  const handleSelectPaper = (id: string) => {
    if (selectedPaperIds.includes(id)) {
      setSelectedPaperIds(selectedPaperIds.filter((paperId) => paperId !== id))
    } else {
      setSelectedPaperIds([...selectedPaperIds, id])
    }
  }

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 1500)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleDownload = async () => {
    if (selectedPaperIds.length === 0) {
      alert("Please select at least one paper to download.")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await downloadFilesAsZip(selectedPaperIds)
    } catch (error) {
      console.error("Error downloading files:", error)
      setError(`Failed to download files: ${error instanceof Error ? error.message : "Unknown error"}`)
      alert("Failed to download files. See console for details.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (selectedPaperIds.length === 0) {
      alert("Please select at least one paper to delete.")
      return
    }

    if (!confirm(`Are you sure you want to move ${selectedPaperIds.length} file(s) to the recycle bin?`)) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Check if we're using sample data
      if (isUsingSampleData) {
        // Simulate success for sample data
        console.log("Using sample data - simulating successful deletion")
        // Remove the selected papers from the list
        setPapers(papers.filter((paper) => !selectedPaperIds.includes(paper.id)))
        // Clear selection
        setSelectedPaperIds([])
        return
      }

      await moveToTrash(selectedPaperIds)

      // If we get here, the operation was successful
      // Refresh the paper list
      await loadPapers()
      // Clear selection
      setSelectedPaperIds([])
    } catch (error) {
      console.error("Error deleting files:", error)
      setError(`Failed to delete files: ${error instanceof Error ? error.message : "Unknown error"}`)
      alert("Failed to delete files. See console for details.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div></div>

      {error && (
        <div className="p-3 bg-amber-50 text-amber-700 text-xs flex items-center gap-2 border-b border-amber-200">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          {isUsingSampleData && (
            <div className="text-xs flex items-center">
              <span className="mr-1">Backend URL:</span>
              <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800">{BACKEND_URL}</code>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-2" />
            <p className="text-sm text-gray-500">Loading papers...</p>
          </div>
        </div>
      ) : papers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-gray-500 mb-2">No papers found</p>
            <p className="text-sm text-gray-400">Upload PDF files to see them listed here</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-visible">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={handleSelectAll}
                    checked={selectedPaperIds.length === papers.length && papers.length > 0}
                  />
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      TITLE
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={handleDownload}
                        disabled={isProcessing || selectedPaperIds.length === 0}
                        className={`p-0.5 rounded hover:bg-gray-200 ${
                          isProcessing || selectedPaperIds.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        title="Download selected papers"
                      >
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isProcessing || selectedPaperIds.length === 0}
                        className={`p-0.5 rounded hover:bg-gray-200 ${
                          isProcessing || selectedPaperIds.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        title="Delete selected papers"
                      >
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center">
                    YEAR
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  KEYWORDS
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  AUTHORS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {papers.map((paper) => (
                <tr key={paper.id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedPaperIds.includes(paper.id)}
                      onChange={() => handleSelectPaper(paper.id)}
                    />
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center group">
                      <span className="mr-2 text-xs">{paper.icon}</span>
                      <span
                        className="text-xs text-gray-900 cursor-pointer group-hover:text-blue-600"
                        onClick={() => copyToClipboard(paper.title, `title-${paper.id}`)}
                        title={paper.title}
                      >
                        {paper.title.length > 50 ? paper.title.substring(0, 50) + "..." : paper.title}
                        {copiedField === `title-${paper.id}` && (
                          <Check className="inline-block ml-1 h-3 w-3 text-green-500" />
                        )}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-500 cursor-pointer hover:text-blue-600"
                    onClick={() => copyToClipboard(paper.year, `year-${paper.id}`)}
                  >
                    {paper.year}
                    {copiedField === `year-${paper.id}` && (
                      <Check className="inline-block ml-1 h-3 w-3 text-green-500" />
                    )}
                  </td>
                  <td
                    className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-500 cursor-pointer hover:text-blue-600"
                    onClick={() => copyToClipboard(paper.keywords.join(", "), `keywords-${paper.id}`)}
                  >
                    {paper.keywords.join(", ")}
                    {copiedField === `keywords-${paper.id}` && (
                      <Check className="inline-block ml-1 h-3 w-3 text-green-500" />
                    )}
                  </td>
                  <td
                    className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-500 cursor-pointer hover:text-blue-600"
                    onClick={() => copyToClipboard(paper.authors.join(", "), `authors-${paper.id}`)}
                  >
                    {paper.authors.join(", ")}
                    {copiedField === `authors-${paper.id}` && (
                      <Check className="inline-block ml-1 h-3 w-3 text-green-500" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 text-xs text-gray-500 sticky bottom-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsRecycleBinOpen(true)} className="text-blue-600" title="Recycle Bin">
              <Trash className="h-5 w-5" />
            </button>
            <button
              onClick={loadPapers}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span>Selected: {selectedPaperIds.length}</span>
            <span>
              {isUsingSampleData ? (
                <span className="text-amber-600">Sample Data</span>
              ) : (
                <>Total: {stats.current} files</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Recycle Bin Modal */}
      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        onFilesRestored={loadPapers}
      />
    </div>
  )
}
