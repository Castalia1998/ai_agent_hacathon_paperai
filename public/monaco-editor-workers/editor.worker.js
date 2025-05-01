// 这个文件是一个占位符
// 在实际部署中，你需要从 Monaco Editor 包中复制实际的 worker 文件到这里
// 或者使用 webpack 插件来自动处理这些文件

self.MonacoEnvironment = {
  baseUrl: "https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/",
}

// This is the main editor worker
self.importScripts("/monaco-editor/min/vs/base/worker/workerMain.js")
