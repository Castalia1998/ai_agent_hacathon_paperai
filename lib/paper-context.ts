"use client"

import { createContext, useContext } from "react"
import type { BackendPaper } from "./paper-api"

interface PaperContextType {
  selectedPapers: BackendPaper[]
  setSelectedPapers: (papers: BackendPaper[]) => void
}

export const PaperContext = createContext<PaperContextType>({
  selectedPapers: [],
  setSelectedPapers: () => {},
})

export const usePaperContext = () => useContext(PaperContext)
