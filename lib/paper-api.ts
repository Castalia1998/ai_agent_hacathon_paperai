import { BACKEND_URL, AUTH_HEADERS } from "@/lib/config"

export interface BackendPaper {
  title: string | null
  authors: string | null
  abstract: string | null
  year: number | null
  file_id: string
  keywords: string[]
}

export interface PaperStats {
  current_file_count: number
  total_uploaded: number
}

export interface PaperSection {
  title: string
  text: string
}

export interface SectionedPaper {
  file_id: string
  sections: PaperSection[]
}

// Sample data to use as fallback when API fails
const SAMPLE_PAPERS: BackendPaper[] = [
  {
    title: "How the Humanization of Pets Is Changing Shopper Habits",
    authors: "Chojnacki",
    abstract: "This paper explores the impact of pet humanization on consumer behavior.",
    year: 2023,
    file_id: "sample1",
    keywords: ["pets", "consumer behavior", "marketing"],
  },
  {
    title: "The Cat-and-Dog Theory of Attachment Style",
    authors: "Artman",
    abstract: "An exploration of how pet ownership relates to human attachment styles.",
    year: 2023,
    file_id: "sample2",
    keywords: ["psychology", "pets", "attachment"],
  },
  {
    title: "Why is pet goods consumption imperceptible for economists?",
    authors: "Gromek, Perek-Białas",
    abstract: "A scoping review of economic perspectives on pet product consumption.",
    year: 2022,
    file_id: "sample3",
    keywords: ["economics", "pets", "consumer behavior"],
  },
]

export async function fetchPaperList(): Promise<BackendPaper[]> {
  try {
    console.log(`Fetching papers from: ${BACKEND_URL}/list_parsed_papers`)

    // Check if BACKEND_URL is properly set
    if (!BACKEND_URL || BACKEND_URL === "") {
      console.error("BACKEND_URL is not set or empty")
      throw new Error("Backend URL is not configured")
    }

    // Add a timeout to the fetch request - Increased from 10 to 30 seconds
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    const response = await fetch(`${BACKEND_URL}/list_parsed_papers`, {
      method: "GET",
      headers: AUTH_HEADERS, // Use the AUTH_HEADERS constant
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    // Log response details for debugging
    console.log("Response status:", response.status)
    console.log("Content-Type header:", response.headers.get("content-type"))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Successfully parsed papers data:", data)

    // Check if the response has the expected structure
    if (!data || !Array.isArray(data.papers)) {
      console.warn("Unexpected response format:", data)
      return SAMPLE_PAPERS
    }

    return data.papers || []
  } catch (error) {
    // Check for specific error types
    if (error instanceof TypeError) {
      console.error("Network error fetching paper list:", error)
    } else if (error.name === "AbortError") {
      console.error("Request timed out fetching paper list")
    } else {
      console.error("Error fetching paper list:", error)
    }

    // Return sample data as fallback
    console.log("Using sample paper data as fallback")
    return SAMPLE_PAPERS
  }
}

export async function fetchPaperStats(): Promise<PaperStats> {
  try {
    console.log(`Fetching stats from: ${BACKEND_URL}/upload_stats`)

    // Check if BACKEND_URL is properly set
    if (!BACKEND_URL || BACKEND_URL === "") {
      console.error("BACKEND_URL is not set or empty")
      throw new Error("Backend URL is not configured")
    }

    // Add a timeout to the fetch request - Increased from 10 to 30 seconds
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    const response = await fetch(`${BACKEND_URL}/upload_stats`, {
      method: "GET",
      headers: AUTH_HEADERS, // Use the AUTH_HEADERS constant
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    console.log("Stats response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Stats data:", data)
    return data
  } catch (error) {
    // Check for specific error types
    if (error instanceof TypeError) {
      console.error("Network error fetching paper stats:", error)
    } else if (error.name === "AbortError") {
      console.error("Request timed out fetching paper stats")
    } else {
      console.error("Error fetching paper stats:", error)
    }

    return {
      current_file_count: SAMPLE_PAPERS.length,
      total_uploaded: SAMPLE_PAPERS.length,
    }
  }
}

// New function to fetch paper sections using smart extraction
export async function fetchPaperSections(fileId: string): Promise<SectionedPaper | null> {
  try {
    console.log(`Fetching smart extracted sections for file: ${fileId}`)

    // Check if BACKEND_URL is properly set
    if (!BACKEND_URL || BACKEND_URL === "") {
      console.error("BACKEND_URL is not set or empty")
      throw new Error("Backend URL is not configured")
    }

    // For sample data, return mock sections
    if (fileId.startsWith("sample")) {
      return getSampleSections(fileId)
    }

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout for potentially complex extraction

    const response = await fetch(`${BACKEND_URL}/smart_extract_sections/${fileId}`, {
      method: "GET",
      headers: AUTH_HEADERS,
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
    console.log("Smart extracted sections:", data)
    return data
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out fetching paper sections")
    } else {
      console.error("Error fetching paper sections:", error)
    }
    return null
  }
}

// New function to fetch full text content of a paper
export async function fetchFullContent(fileId: string): Promise<ReadableStream<Uint8Array> | null> {
  try {
    console.log(`Fetching full content for file: ${fileId}`)

    // Check if BACKEND_URL is properly set
    if (!BACKEND_URL || BACKEND_URL === "") {
      console.error("BACKEND_URL is not set or empty")
      throw new Error("Backend URL is not configured")
    }

    // Add a timeout to the fetch request - Set to 60 seconds for potentially large content
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout for full content

    const response = await fetch(`${BACKEND_URL}/get_full_content/${fileId}`, {
      method: "GET",
      headers: AUTH_HEADERS,
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    // Return the stream directly for processing by the caller
    return response.body
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out fetching full content")
    } else {
      console.error("Error fetching full content:", error)
    }
    return null
  }
}

// Function to fetch paper analysis
export async function fetchPaperAnalysis(fileId: string): Promise<ReadableStream<Uint8Array> | null> {
  try {
    console.log(`Fetching analysis for file: ${fileId}`)

    // Check if BACKEND_URL is properly set
    if (!BACKEND_URL || BACKEND_URL === "") {
      console.error("BACKEND_URL is not set or empty")
      throw new Error("Backend URL is not configured")
    }

    // Add a timeout to the fetch request - Set to 60 seconds for potentially large content
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout for analysis

    const response = await fetch(`${BACKEND_URL}/get_full_content/${fileId}`, {
      method: "GET",
      headers: AUTH_HEADERS,
      signal: controller.signal,
    })

    // Clear the timeout
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    // Return the stream directly for processing by the caller
    return response.body
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out fetching paper analysis")
    } else {
      console.error("Error fetching paper analysis:", error)
    }
    return null
  }
}

// Sample sections for testing when backend is not available
function getSampleSections(fileId: string): SectionedPaper {
  if (fileId === "sample1") {
    return {
      file_id: fileId,
      sections: [
        {
          title: "Introduction",
          text: "1 Introduction\n\nThe humanization of pets—treating companion animals as family members rather than property—has become a significant societal trend in recent decades. This shift has profound implications for consumer behavior, product development, and marketing strategies in the pet industry and beyond.",
        },
        {
          title: "Literature Review",
          text: "2 Literature Review\n\nPrevious studies have documented the growing tendency for pet owners to view their animals as family members. Smith and Jones (2018) found that 83% of dog owners and 78% of cat owners consider their pets to be full-fledged family members. This perspective influences purchasing decisions across multiple categories.",
        },
        {
          title: "Methodology",
          text: "3 Methodology\n\nThis study employed a mixed-methods approach, combining survey data from 1,200 pet owners with in-depth interviews of 25 participants. Shopping behavior was tracked through receipt analysis and digital shopping cart data.",
        },
        {
          title: "Results",
          text: '4 Results\n\nOur findings indicate that pet humanization correlates strongly with increased spending on premium pet products, particularly in food, healthcare, and comfort items. Pet owners who strongly identify with the "pet parent" label spend an average of 35% more annually on pet-related purchases than those who do not.',
        },
        {
          title: "Discussion",
          text: "5 Discussion\n\nThe implications for retailers are significant. Stores that recognize and cater to the emotional connection between pets and their owners see higher customer loyalty and basket sizes. Marketing that acknowledges the familial role of pets resonates more strongly with modern consumers.",
        },
        {
          title: "Conclusion",
          text: "6 Conclusion\n\nAs pet humanization continues to grow as a cultural phenomenon, retailers and brands must adapt their offerings and messaging to align with consumers' perception of pets as family members. This represents both a challenge and an opportunity for businesses across multiple sectors.",
        },
      ],
    }
  } else if (fileId === "sample2") {
    return {
      file_id: fileId,
      sections: [
        {
          title: "Introduction",
          text: "1 Introduction\n\nAttachment theory, first developed by John Bowlby, describes how people form emotional bonds with others. This study explores a novel hypothesis: that preference for cats versus dogs may correlate with different attachment styles in human relationships.",
        },
        {
          title: "Background",
          text: "2 Background\n\nAttachment styles are typically categorized as secure, anxious, avoidant, or disorganized. These patterns, formed in early childhood, often persist into adulthood and influence romantic relationships, friendships, and other social bonds.",
        },
        {
          title: "Methodology",
          text: '3 Methodology\n\nWe surveyed 2,500 adults, assessing both their attachment style using the Adult Attachment Interview (AAI) and their pet preferences. Participants were categorized as "dog people," "cat people," "both," or "neither." Follow-up interviews were conducted with a subset of 100 participants.',
        },
        {
          title: "Results",
          text: "4 Results\n\nOur findings suggest a statistically significant correlation between pet preference and attachment style. Dog owners showed higher rates of secure attachment (65%) compared to cat owners (45%). Cat owners displayed higher rates of avoidant attachment (30%) compared to dog owners (15%).",
        },
        {
          title: "Discussion",
          text: "5 Discussion\n\nThese correlations may reflect the different relationship styles that cats and dogs offer. Dogs typically provide unconditional positive regard and require consistent interaction, mirroring secure attachment relationships. Cats often offer more independence and less constant validation, potentially appealing to those with more avoidant tendencies.",
        },
        {
          title: "Therapeutic Applications",
          text: "6 Therapeutic Applications\n\nUnderstanding these correlations could inform animal-assisted therapy approaches. For individuals with anxious attachment, interaction with dogs might provide the consistent affirmation they seek. For those with avoidant attachment, cats might offer a less threatening entry point to forming emotional bonds.",
        },
        {
          title: "Limitations",
          text: "7 Limitations\n\nThis study cannot establish causality—whether pet preferences shape attachment styles or vice versa. Cultural factors and early exposure to different pets may also play significant roles not fully accounted for in our analysis.",
        },
        {
          title: "Conclusion",
          text: "8 Conclusion\n\nWhile further research is needed, these findings suggest that pet preferences may offer insights into human attachment patterns and potentially provide pathways for addressing attachment-related challenges in therapeutic settings.",
        },
      ],
    }
  } else {
    return {
      file_id: fileId,
      sections: [
        {
          title: "Introduction",
          text: "1 Introduction\n\nDespite the pet industry's substantial economic footprint—exceeding $100 billion annually in the United States alone—it remains notably absent from many mainstream economic analyses and models. This paper explores the reasons for this oversight and its implications.",
        },
        {
          title: "Historical Context",
          text: "2 Historical Context\n\nEconomic theory has traditionally focused on rational utility maximization, with consumption decisions presumed to be driven by functional needs and logical cost-benefit analyses. Pet-related spending, often driven by emotional rather than purely rational factors, has consequently been marginalized in economic discourse.",
        },
        {
          title: "Literature Review",
          text: "3 Literature Review\n\nOur review of major economic journals from 1980-2020 reveals that pet-related consumption receives less than 0.5% of research attention despite representing approximately 1-2% of household spending in developed economies. This discrepancy suggests a systematic blind spot in economic research.",
        },
        {
          title: "Theoretical Framework",
          text: '4 Theoretical Framework\n\nWe propose that this oversight stems from three factors: (1) the emotional rather than purely utilitarian nature of pet spending, (2) the difficulty in quantifying the "returns" on pet investments, and (3) lingering biases that categorize pet spending as luxury or frivolous consumption rather than meaningful economic activity.',
        },
        {
          title: "Economic Impact Analysis",
          text: "5 Economic Impact Analysis\n\nWhen properly accounted for, pet-related spending has significant economic multiplier effects. It supports veterinary services, food production, retail, insurance, and various service industries. During economic downturns, pet spending shows remarkable resilience compared to other discretionary categories.",
        },
        {
          title: "Policy Implications",
          text: "6 Policy Implications\n\nThe invisibility of pet consumption in economic analyses leads to policy oversights. For example, disaster planning often inadequately addresses pet needs, despite evidence that many people refuse evacuation if they cannot bring pets, creating larger economic and human costs.",
        },
        {
          title: "Recommendations",
          text: "7 Recommendations\n\nWe recommend: (1) inclusion of pet-related spending as a distinct category in economic surveys and analyses, (2) development of economic models that better account for emotional drivers of consumption, and (3) recognition of the pet industry as a significant economic sector in policy planning.",
        },
        {
          title: "Conclusion",
          text: "8 Conclusion\n\nAs households increasingly view pets as family members, the economic significance of pet-related spending will continue to grow. Economists must adapt their frameworks to properly account for this sector or risk increasingly inaccurate models of consumer behavior and economic activity.",
        },
      ],
    }
  }
}

// Sample full text for testing when backend is not available
export function getSampleFullText(fileId: string): string {
  // Return different sample text based on file ID
  if (fileId === "sample1") {
    return `# How the Humanization of Pets Is Changing Shopper Habits

## Abstract
This paper explores the impact of pet humanization on consumer behavior. As pets increasingly become viewed as family members, consumer spending patterns and product preferences are shifting dramatically. This research examines these trends and their implications for retailers and marketers.

## Introduction
The humanization of pets—treating companion animals as family members rather than property—has become a significant societal trend in recent decades. This shift has profound implications for consumer behavior, product development, and marketing strategies in the pet industry and beyond.

## Literature Review
Previous studies have documented the growing tendency for pet owners to view their animals as family members. Smith and Jones (2018) found that 83% of dog owners and 78% of cat owners consider their pets to be full-fledged family members. This perspective influences purchasing decisions across multiple categories.

## Methodology
This study employed a mixed-methods approach, combining survey data from 1,200 pet owners with in-depth interviews of 25 participants. Shopping behavior was tracked through receipt analysis and digital shopping cart data.

## Results
Our findings indicate that pet humanization correlates strongly with increased spending on premium pet products, particularly in food, healthcare, and comfort items. Pet owners who strongly identify with the "pet parent" label spend an average of 35% more annually on pet-related purchases than those who do not.

## Discussion
The implications for retailers are significant. Stores that recognize and cater to the emotional connection between pets and their owners see higher customer loyalty and basket sizes. Marketing that acknowledges the familial role of pets resonates more strongly with modern consumers.

## Conclusion
As pet humanization continues to grow as a cultural phenomenon, retailers and brands must adapt their offerings and messaging to align with consumers' perception of pets as family members. This represents both a challenge and an opportunity for businesses across multiple sectors.`
  } else if (fileId === "sample2") {
    return `# The Cat-and-Dog Theory of Attachment Style

## Abstract
An exploration of how pet ownership relates to human attachment styles. This research investigates whether preferences for cats versus dogs correlate with different attachment styles in human relationships, and examines the potential therapeutic applications of this knowledge.

## Introduction
Attachment theory, first developed by John Bowlby, describes how people form emotional bonds with others. This study explores a novel hypothesis: that preference for cats versus dogs may correlate with different attachment styles in human relationships.

## Background
Attachment styles are typically categorized as secure, anxious, avoidant, or disorganized. These patterns, formed in early childhood, often persist into adulthood and influence romantic relationships, friendships, and other social bonds.

## Methodology
We surveyed 2,500 adults, assessing both their attachment style using the Adult Attachment Interview (AAI) and their pet preferences. Participants were categorized as "dog people," "cat people," "both," or "neither." Follow-up interviews were conducted with a subset of 100 participants.

## Results
Our findings suggest a statistically significant correlation between pet preference and attachment style. Dog owners showed higher rates of secure attachment (65%) compared to cat owners (45%). Cat owners displayed higher rates of avoidant attachment (30%) compared to dog owners (15%).

## Discussion
These correlations may reflect the different relationship styles that cats and dogs offer. Dogs typically provide unconditional positive regard and require consistent interaction, mirroring secure attachment relationships. Cats often offer more independence and less constant validation, potentially appealing to those with more avoidant tendencies.

## Therapeutic Applications
Understanding these correlations could inform animal-assisted therapy approaches. For individuals with anxious attachment, interaction with dogs might provide the consistent affirmation they seek. For those with avoidant attachment, cats might offer a less threatening entry point to forming emotional bonds.

## Limitations
This study cannot establish causality—whether pet preferences shape attachment styles or vice versa. Cultural factors and early exposure to different pets may also play significant roles not fully accounted for in our analysis.

## Conclusion
While further research is needed, these findings suggest that pet preferences may offer insights into human attachment patterns and potentially provide pathways for addressing attachment-related challenges in therapeutic settings.`
  } else {
    return `# Why is pet goods consumption imperceptible for economists?

## Abstract
A scoping review of economic perspectives on pet product consumption. This paper examines the historical neglect of pet-related spending in economic analyses and argues for greater inclusion of this significant market sector in economic models and policy considerations.

## Introduction
Despite the pet industry's substantial economic footprint—exceeding $100 billion annually in the United States alone—it remains notably absent from many mainstream economic analyses and models. This paper explores the reasons for this oversight and its implications.

## Historical Context
Economic theory has traditionally focused on rational utility maximization, with consumption decisions presumed to be driven by functional needs and logical cost-benefit analyses. Pet-related spending, often driven by emotional rather than purely rational factors, has consequently been marginalized in economic discourse.

## Literature Review
Our review of major economic journals from 1980-2020 reveals that pet-related consumption receives less than 0.5% of research attention despite representing approximately 1-2% of household spending in developed economies. This discrepancy suggests a systematic blind spot in economic research.

## Theoretical Framework
We propose that this oversight stems from three factors: (1) the emotional rather than purely utilitarian nature of pet spending, (2) the difficulty in quantifying the "returns" on pet investments, and (3) lingering biases that categorize pet spending as luxury or frivolous consumption rather than meaningful economic activity.

## Economic Impact Analysis
When properly accounted for, pet-related spending has significant economic multiplier effects. It supports veterinary services, food production, retail, insurance, and various service industries. During economic downturns, pet spending shows remarkable resilience compared to other discretionary categories.

## Policy Implications
The invisibility of pet consumption in economic analyses leads to policy oversights. For example, disaster planning often inadequately addresses pet needs, despite evidence that many people refuse evacuation if they cannot bring pets, creating larger economic and human costs.

## Recommendations
We recommend: (1) inclusion of pet-related spending as a distinct category in economic surveys and analyses, (2) development of economic models that better account for emotional drivers of consumption, and (3) recognition of the pet industry as a significant economic sector in policy planning.

## Conclusion
As households increasingly view pets as family members, the economic significance of pet-related spending will continue to grow. Economists must adapt their frameworks to properly account for this sector or risk increasingly inaccurate models of consumer behavior and economic activity.`
  }
}
