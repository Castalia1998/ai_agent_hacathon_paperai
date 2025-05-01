
# Frontend Documentation

## Frontend Tech Stack

We chose to develop a web-based application. To ensure service stability and a flexible development experience, we adopted the following tech stack and deployed the frontend separately with a fixed domain. This separation of frontend and backend keeps the backend environment clean and maintainable.

- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **API Communication**: Fetch API
- **Markdown Rendering**: React Markdown

## User Experience Design

From a UX perspective, the frontend is designed to minimize researchers’ cognitive load. The top priority is intuitive UI and clear interaction logic with zero learning curve. The layout is clean and simple, allowing users to focus on paper analysis. It consists of a title bar and resizable left-right panels.

### Layout Overview

- **Left Panel** (default width: 30%): Contains the AI assistant and paper list. It is collapsible to free up space for the main content.
- **Right Panel** (default width: 70%): Displays paper content and structured analysis.

**Focus Guidance**: Frequent user actions occur on the left; visual attention is directed to the right. Panel sizes can be adjusted by dragging the separator.

![image.png](image.png)

## Feature Guide

Based on this layout, the frontend implements concrete features across three modules: Research Assistant, Paper Management, and Text Analysis.

- **Paper Management Module**: 
  - Upload papers with progress indication
  - View and sort the paper list by title, year, etc.
  - Safe deletion and restore via recycle bin modal
  - Batch operations: select multiple papers for bulk download or deletion
  - Quick copy of paper info (title, authors, etc.)

- **Research Assistant Module**: 
  - Chat UI for natural language interaction with AI
  - Access via the "Research Assistant" tab in the left panel
  - Type queries in the bottom input field
  - Upload PDFs directly in chat using the paperclip icon
  - **Context-aware and rich text support in replies**

- **Text Editor Module**: 
  - Smart extraction of title, authors, abstract
  - Automatic detection of paper sections
  - Generate full paper analysis
  - Refresh button to re-analyze
  - One-click copy and auto-save of edited content
  - **Supports Markdown**, including code blocks and tables

## Development Guide

### Project Structure

```
paper-ai/
├── app/                  # Next.js application directory
│   ├── layout.tsx        # Main layout component
│   ├── page.tsx          # Main page component
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── chat-sidebar.tsx  # Chat sidebar
│   ├── header.tsx        # Header
│   ├── product-list.tsx  # Paper list
│   ├── text-editor.tsx   # Text editor
│   └── ...               # Other components
├── lib/                  # Utility functions and API clients
│   ├── chat-api.ts       # Chat API client
│   ├── config.ts         # App configuration
│   ├── paper-api.ts      # Paper API client
│   ├── paper-context.ts  # Paper context
│   └── ...               # Other utilities
├── public/               # Static assets
├── .env.local            # Local environment variables
├── next.config.mjs       # Next.js config
└── package.json          # Project dependencies
```

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Start Development Server

```bash
npm run dev
# or
yarn dev
```

### Build Production Version

```bash
npm run build
# or
yarn build
```

### Set Environment Variables

```bash
| NEXT_PUBLIC_BACKEND_URL | Backend API base URL | https://api.example.com
| ALLOWED_ORIGINS         | Allowed origins (comma-separated) | https://app.example.com,https://dev.example.com
```
