"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, RefreshCw, Trash2, RotateCcw } from "lucide-react"
import { fetchTrashFiles, restoreFiles, permanentlyDeleteFiles, type TrashFile } from "@/lib/recycle-bin-api"

interface RecycleBinModalProps {
  isOpen: boolean
  onClose: () => void
  onFilesRestored: () => void
}

export function RecycleBinModal({ isOpen, onClose, onFilesRestored }: RecycleBinModalProps) {
  const [trashFiles, setTrashFiles] = useState<TrashFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load trash files when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTrashFiles()
    }
  }, [isOpen])

  const loadTrashFiles = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const files = await fetchTrashFiles()
      setTrashFiles(files)
      setSelectedFileIds([])
    } catch (err) {
      console.error("Error in loadTrashFiles:", err)
      setError("Failed to load deleted files. See console for details.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFileIds(trashFiles.map((file) => file.file_id))
    } else {
      setSelectedFileIds([])
    }
  }

  const handleSelectFile = (id: string) => {
    if (selectedFileIds.includes(id)) {
      setSelectedFileIds(selectedFileIds.filter((fileId) => fileId !== id))
    } else {
      setSelectedFileIds([...selectedFileIds, id])
    }
  }

  const handleRestore = async () => {
    if (selectedFileIds.length === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      await restoreFiles(selectedFileIds)

      // If we get here, the operation was successful
      // Refresh the list
      await loadTrashFiles()
      // Notify parent component to refresh main list
      onFilesRestored()
    } catch (err) {
      console.error("Error in handleRestore:", err)
      setError(`Failed to restore files: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (selectedFileIds.length === 0) return

    if (!confirm("Are you sure you want to permanently delete these files? This action cannot be undone.")) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await permanentlyDeleteFiles(selectedFileIds)

      // If we get here, the operation was successful
      // Refresh the list
      await loadTrashFiles()
    } catch (err) {
      console.error("Error in handlePermanentDelete:", err)
      setError(`Failed to delete files: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium">Recycle Bin</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm flex items-center gap-2 border-b border-red-200">
            <div className="flex-1">{error}</div>
          </div>
        )}

        <div className="p-4 max-h-[60vh] overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : trashFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Recycle bin is empty</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={handleSelectAll}
                      checked={selectedFileIds.length === trashFiles.length && trashFiles.length > 0}
                    />
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trashFiles.map((file) => (
                  <tr key={file.file_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedFileIds.includes(file.file_id)}
                        onChange={() => handleSelectFile(file.file_id)}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{file.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between">
          <div>
            <span className="text-sm text-gray-500">
              {selectedFileIds.length} of {trashFiles.length} files selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              disabled={selectedFileIds.length === 0 || isProcessing}
              className={`flex items-center gap-1 text-sm py-1.5 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors ${
                isProcessing || selectedFileIds.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <RotateCcw className="w-4 h-4" /> Restore
            </button>
            <button
              onClick={handlePermanentDelete}
              disabled={selectedFileIds.length === 0 || isProcessing}
              className={`flex items-center gap-1 text-sm py-1.5 px-3 rounded bg-red-600 text-white hover:bg-red-700 transition-colors ${
                isProcessing || selectedFileIds.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Trash2 className="w-4 h-4" /> Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
