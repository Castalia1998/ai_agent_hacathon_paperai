const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Create the directory structure
const monacoDir = path.join(__dirname, "../public/monaco-editor")
const minDir = path.join(monacoDir, "min")
const vsDir = path.join(minDir, "vs")

// Create directories if they don't exist
if (!fs.existsSync(monacoDir)) {
  fs.mkdirSync(monacoDir, { recursive: true })
}
if (!fs.existsSync(minDir)) {
  fs.mkdirSync(minDir, { recursive: true })
}
if (!fs.existsSync(vsDir)) {
  fs.mkdirSync(vsDir, { recursive: true })
}

// Copy Monaco Editor files from node_modules
try {
  console.log("Copying Monaco Editor files...")

  // Copy the base worker
  execSync(`cp -r node_modules/monaco-editor/min/vs/base ${vsDir}/`)

  // Copy language workers
  execSync(`cp -r node_modules/monaco-editor/min/vs/language ${vsDir}/`)

  console.log("Monaco Editor files copied successfully!")
} catch (error) {
  console.error("Error copying Monaco Editor files:", error)
  process.exit(1)
}
