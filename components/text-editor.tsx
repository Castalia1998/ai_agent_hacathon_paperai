"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Copy, Check, RefreshCw, FileText, FileDigit } from "lucide-react"
import { BACKEND_URL, AUTH_HEADERS } from "@/lib/config"
import { usePaperContext } from "@/lib/paper-context"
import { fetchPaperSections, type PaperSection } from "@/lib/paper-api"

export function TextEditor() {
  const [text, setText] = useState("")
  const [paperSections, setPaperSections] = useState<PaperSection[]>([])
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)
  const [analysisText, setAnalysisText] = useState("")
  const [viewMode, setViewMode] = useState<"details" | "analysis">("details")
  const { selectedPapers } = usePaperContext()
  const analysisStreamRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const decoder = useRef(new TextDecoder())

  // Format paper details into text with improved formatting
  const formatPaperDetails = (papers: any[]) => {
    console.log("Formatting paper details for papers:", papers)
    if (papers.length === 0) {
      return "No papers selected. Please select a paper from the list to view its details."
    }

    return papers
      .map((paper) => {
        let formattedText = ""

        // Title - now bold
        formattedText += `# ${paper.title || "Unknown Title"}\n\n`

        // Authors
        if (paper.authors) {
          formattedText += `**Authors:** ${paper.authors}\n\n`
        }

        // Year
        if (paper.year) {
          formattedText += `**Year:** ${paper.year}\n\n`
        }

        // Keywords
        if (paper.keywords && paper.keywords.length > 0) {
          formattedText += `**Keywords:** ${paper.keywords.join(", ")}\n\n`
        }

        // Abstract
        if (paper.abstract) {
          formattedText += `**Abstract:**\n${paper.abstract}\n\n`
        }

        return formattedText
      })
      .join("---\n\n")
  }

  // Update text when selected papers change
  useEffect(() => {
    console.log("Selected papers changed:", selectedPapers)
    const formattedText = formatPaperDetails(selectedPapers)
    console.log("Formatted text:", formattedText)
    setText(formattedText)

    // Reset sections when selection changes
    setPaperSections([])

    // Reset analysis when selection changes
    setAnalysisText("")

    // Cancel any ongoing stream
    if (analysisStreamRef.current) {
      analysisStreamRef.current.cancel()
      analysisStreamRef.current = null
    }

    // If we have a selected paper, load its sections
    if (selectedPapers.length > 0) {
      loadPaperSections(selectedPapers[0].file_id)
    }
  }, [selectedPapers])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  const handleCopy = async () => {
    try {
      const textToCopy = viewMode === "details" ? text : analysisText
      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)

    try {
      if (viewMode === "details") {
        // Refresh details
        if (selectedPapers.length > 0) {
          const formattedText = formatPaperDetails(selectedPapers)
          setText(formattedText)
          await loadPaperSections(selectedPapers[0].file_id)
        }
      } else if (viewMode === "analysis") {
        // Refresh analysis
        if (selectedPapers.length > 0) {
          await loadPaperAnalysis(selectedPapers[0].file_id)
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPaperSections = async (fileId: string) => {
    console.log("Loading paper sections for file ID:", fileId)
    setIsLoadingSections(true)

    try {
      // Fetch the sectioned content
      const sectionedPaper = await fetchPaperSections(fileId)
      console.log("Received sectioned paper:", sectionedPaper)

      if (!sectionedPaper || !sectionedPaper.sections || sectionedPaper.sections.length === 0) {
        console.log("No sections found for this paper")
        return
      }

      // Set the sections
      setPaperSections(sectionedPaper.sections)

      // Append sections to the text
      setText((prevText) => {
        let sectionsText = "\n\n## Paper Sections\n\n"
        sectionedPaper.sections.forEach((section) => {
          sectionsText += `### ${section.title}\n\n${section.text}\n\n`
        })
        console.log("Appending sections text:", sectionsText)
        return prevText + sectionsText
      })
    } catch (error) {
      console.error("Error fetching paper sections:", error)
    } finally {
      setIsLoadingSections(false)
    }
  }

  const loadPaperAnalysis = async (fileId: string) => {
    console.log("Loading paper analysis for file ID:", fileId)
    setIsLoadingAnalysis(true)
    setAnalysisText("Analyzing paper content...")

    try {
      // Cancel any previous stream
      if (analysisStreamRef.current) {
        analysisStreamRef.current.cancel()
        analysisStreamRef.current = null
      }

      console.log(`Fetching analysis for file: ${fileId}`)
      const response = await fetch(`${BACKEND_URL}/get_full_content/${fileId}`, {
        headers: AUTH_HEADERS,
      })

      console.log("Analysis response status:", response.status)
      console.log("Analysis response headers:", response.headers)

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error("Response body is null")
      }

      const reader = response.body.getReader()
      analysisStreamRef.current = reader

      // Reset analysis text
      setAnalysisText("")

      // Process the stream
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log("Analysis stream complete")
          break
        }

        // Decode and append the chunk
        const chunk = decoder.current.decode(value, { stream: true })
        console.log("Received chunk:", chunk.substring(0, 100) + "...") // Log a sample of the chunk
        setAnalysisText((prev) => prev + chunk)
      }
    } catch (error) {
      console.error("Error fetching paper analysis:", error)
      setAnalysisText("Failed to load analysis. Please try again later.")
    } finally {
      setIsLoadingAnalysis(false)
      analysisStreamRef.current = null
    }
  }

  // Render Markdown content
  const renderMarkdown = (markdown: string) => {
    // Split the markdown into lines for processing
    const lines = markdown.split("\n")
    const result: React.ReactNode[] = []
    let inCodeBlock = false
    let codeBlockContent = ""
    let codeBlockLanguage = ""
    let inOrderedList = false
    let inUnorderedList = false
    let listItems: React.ReactNode[] = []
    let currentListLevel = 0
    let blockquoteContent = ""
    let inBlockquote = false

    const processLine = (index: number, line: string) => {
      // Check for code blocks
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true
          codeBlockLanguage = line.slice(3).trim()
          return null
        } else {
          // End of code block
          inCodeBlock = false
          const codeElement = (
            <pre key={`code-${index}`} className="bg-gray-100 p-3 rounded-md my-4 overflow-x-auto">
              <code className={codeBlockLanguage ? `language-${codeBlockLanguage}` : ""}>{codeBlockContent}</code>
            </pre>
          )
          codeBlockContent = ""
          codeBlockLanguage = ""
          return codeElement
        }
      }

      // If we're in a code block, add the line to the code content
      if (inCodeBlock) {
        codeBlockContent += line + "\n"
        return null
      }

      // Check for blockquotes
      if (line.startsWith(">")) {
        if (!inBlockquote) {
          inBlockquote = true
          blockquoteContent = line.slice(1).trim() + "\n"
        } else {
          blockquoteContent += line.slice(1).trim() + "\n"
        }
        return null
      } else if (inBlockquote && line.trim() !== "") {
        // Continue blockquote if the line is not empty
        blockquoteContent += line + "\n"
        return null
      } else if (inBlockquote) {
        // End blockquote on empty line
        inBlockquote = false
        const blockquoteElement = (
          <blockquote key={`blockquote-${index}`} className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">
            {processInlineMarkdown(blockquoteContent)}
          </blockquote>
        )
        blockquoteContent = ""
        return blockquoteElement
      }

      // Check for headings
      if (line.startsWith("# ")) {
        return (
          <h1 key={`h1-${index}`} className="text-2xl font-bold mt-6 mb-4">
            {processInlineMarkdown(line.slice(2))}
          </h1>
        )
      } else if (line.startsWith("## ")) {
        return (
          <h2 key={`h2-${index}`} className="text-xl font-bold mt-5 mb-3">
            {processInlineMarkdown(line.slice(3))}
          </h2>
        )
      } else if (line.startsWith("### ")) {
        return (
          <h3 key={`h3-${index}`} className="text-lg font-semibold mt-4 mb-2">
            {processInlineMarkdown(line.slice(4))}
          </h3>
        )
      } else if (line.startsWith("#### ")) {
        return (
          <h4 key={`h4-${index}`} className="text-base font-semibold mt-3 mb-2">
            {processInlineMarkdown(line.slice(5))}
          </h4>
        )
      } else if (line.startsWith("##### ")) {
        return (
          <h5 key={`h5-${index}`} className="text-sm font-semibold mt-3 mb-1">
            {processInlineMarkdown(line.slice(6))}
          </h5>
        )
      } else if (line.startsWith("###### ")) {
        return (
          <h6 key={`h6-${index}`} className="text-xs font-semibold mt-2 mb-1">
            {processInlineMarkdown(line.slice(7))}
          </h6>
        )
      }

      // Check for horizontal rule
      if (line === "---" || line === "***" || line === "___") {
        return <hr key={`hr-${index}`} className="my-4 border-t border-gray-300" />
      }

      // Check for unordered lists
      if (line.match(/^\s*[-*+]\s/)) {
        const indent = line.search(/[-*+]/)
        const level = Math.floor(indent / 2)
        const content = line.replace(/^\s*[-*+]\s/, "")

        if (!inUnorderedList) {
          inUnorderedList = true
          currentListLevel = level
          listItems = [
            <li key={`ul-item-${index}`} className="ml-4">
              {processInlineMarkdown(content)}
            </li>,
          ]
          return null
        } else {
          // Add to existing list
          listItems.push(
            <li key={`ul-item-${index}`} className={`ml-${level * 4}`}>
              {processInlineMarkdown(content)}
            </li>,
          )
          return null
        }
      } else if (inUnorderedList && line.trim() === "") {
        // End list on empty line
        inUnorderedList = false
        return (
          <ul key={`ul-${index}`} className="list-disc pl-5 my-4">
            {listItems}
          </ul>
        )
      }

      // Check for ordered lists
      const orderedListMatch = line.match(/^\s*(\d+)\.\s(.*)/)
      if (orderedListMatch) {
        const indent = line.search(/\d/)
        const level = Math.floor(indent / 2)
        const content = orderedListMatch[2]

        if (!inOrderedList) {
          inOrderedList = true
          currentListLevel = level
          listItems = [
            <li key={`ol-item-${index}`} className="ml-4">
              {processInlineMarkdown(content)}
            </li>,
          ]
          return null
        } else {
          // Add to existing list
          listItems.push(
            <li key={`ol-item-${index}`} className={`ml-${level * 4}`}>
              {processInlineMarkdown(content)}
            </li>,
          )
          return null
        }
      } else if (inOrderedList && line.trim() === "") {
        // End list on empty line
        inOrderedList = false
        return (
          <ol key={`ol-${index}`} className="list-decimal pl-5 my-4">
            {listItems}
          </ol>
        )
      }

      // Regular paragraph (if not empty)
      if (line.trim() !== "") {
        return (
          <p key={`p-${index}`} className="my-2">
            {processInlineMarkdown(line)}
          </p>
        )
      }

      // Empty line
      return <br key={`br-${index}`} />
    }

    // Process inline markdown elements (bold, italic, code, links)
    const processInlineMarkdown = (text: string) => {
      // Handle newlines first - replace \n with <br /> tags
      text = text.replace(/\n/g, "<br />")

      // Process inline code
      text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')

      // Process bold text
      text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>")

      // Process italic text
      text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>")
      text = text.replace(/_([^_]+)_/g, "<em>$1</em>")

      // Process links
      text = text.replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')

      // Return as HTML
      return <span dangerouslySetInnerHTML={{ __html: text }} />
    }

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const element = processLine(i, lines[i])
      if (element) {
        result.push(element)
      }
    }

    // Handle any unclosed elements
    if (inCodeBlock) {
      result.push(
        <pre key="code-final" className="bg-gray-100 p-3 rounded-md my-4 overflow-x-auto">
          <code className={codeBlockLanguage ? `language-${codeBlockLanguage}` : ""}>{codeBlockContent}</code>
        </pre>,
      )
    }

    if (inUnorderedList) {
      result.push(
        <ul key="ul-final" className="list-disc pl-5 my-4">
          {listItems}
        </ul>,
      )
    }

    if (inOrderedList) {
      result.push(
        <ol key="ol-final" className="list-decimal pl-5 my-4">
          {listItems}
        </ol>,
      )
    }

    if (inBlockquote) {
      result.push(
        <blockquote key="blockquote-final" className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">
          {processInlineMarkdown(blockquoteContent)}
        </blockquote>,
      )
    }

    return result
  }

  // Render details view with simple formatting
  const renderDetails = () => {
    return text.split("\n").map((line, index) => {
      // Format headings (lines starting with #)
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-xl font-bold mb-3 mt-4">
            {line.substring(2)}
          </h1>
        )
      }

      // Format subheadings (lines starting with ##)
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-lg font-bold mb-2 mt-3">
            {line.substring(3)}
          </h2>
        )
      }

      // Format subheadings (lines starting with ###)
      if (line.startsWith("### ")) {
        return (
          <h3 key={index} className="text-md font-semibold mb-2 mt-3">
            {line.substring(4)}
          </h3>
        )
      }

      // Format bold text (lines with ** at beginning)
      if (line.startsWith("**") && line.includes(":**")) {
        const [label, content] = line.split(":**")
        return (
          <p key={index} className="mb-2">
            <span className="font-bold">{label.substring(2)}:</span>
            {content}
          </p>
        )
      }

      // Format dividers
      if (line === "---") {
        return <hr key={index} className="my-6 border-gray-300" />
      }

      // Regular paragraph
      return line ? (
        <p key={index} className="mb-2">
          {line}
        </p>
      ) : (
        <br key={index} />
      )
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="py-2 px-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode("details")}
            className={`flex items-center gap-2 py-1 px-3 rounded-md transition-colors ${
              viewMode === "details" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
            }`}
            title="View paper details"
          >
            <FileDigit className="w-4 h-4" /> Details
          </button>
          <button
            onClick={() => {
              setViewMode("analysis")
              if (selectedPapers.length > 0 && !analysisText) {
                loadPaperAnalysis(selectedPapers[0].file_id)
              }
            }}
            className={`flex items-center gap-2 py-1 px-3 rounded-md transition-colors ${
              viewMode === "analysis" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
            }`}
            title="View paper analysis"
          >
            <FileText className="w-4 h-4" /> Analysis
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-xs py-1 px-2 rounded hover:bg-gray-100 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs py-1 px-2 rounded hover:bg-gray-100 transition-colors"
            disabled={viewMode === "details" ? !text.trim() : !analysisText.trim()}
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        </div>
        <div className="flex items-center">
          {isLoadingSections && viewMode === "details" && (
            <div className="flex items-center text-xs text-gray-500">
              <RefreshCw className="w-3 h-3 animate-spin mr-1" /> Loading sections...
            </div>
          )}
          {isLoadingAnalysis && viewMode === "analysis" && (
            <div className="flex items-center text-xs text-gray-500">
              <RefreshCw className="w-3 h-3 animate-spin mr-1" /> Analyzing...
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto bg-white w-full h-full">
        {viewMode === "details" ? (
          // Render details view
          selectedPapers.length === 0 ? (
            <div className="text-gray-500">Select a paper to view details</div>
          ) : (
            renderDetails()
          )
        ) : // Render analysis view
        selectedPapers.length === 0 ? (
          <div className="text-gray-500">Select a paper to view analysis</div>
        ) : analysisText ? (
          <div className="whitespace-pre-wrap markdown-content">{renderMarkdown(analysisText)}</div>
        ) : (
          <div className="text-gray-500">Analysis will appear here</div>
        )}
      </div>
    </div>
  )
}
