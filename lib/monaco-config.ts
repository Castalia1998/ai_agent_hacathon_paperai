// Monaco Editor 配置文件

/**
 * 配置 Monaco Editor 环境
 * 这个函数应该在使用 Monaco Editor 之前调用
 */
export function setupMonacoEnvironment() {
  // 确保我们在浏览器环境中
  if (typeof window !== "undefined") {
    // 定义 MonacoEnvironment 全局变量
    window.MonacoEnvironment = {
      getWorkerUrl: (_moduleId: string, label: string) => {
        // 根据语言类型返回不同的 worker 路径
        if (label === "json") {
          return "/monaco-editor-workers/json.worker.js"
        }
        if (label === "css" || label === "scss" || label === "less") {
          return "/monaco-editor-workers/css.worker.js"
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
          return "/monaco-editor-workers/html.worker.js"
        }
        if (label === "typescript" || label === "javascript") {
          return "/monaco-editor-workers/ts.worker.js"
        }
        return "/monaco-editor-workers/editor.worker.js"
      },
    }
  }
}

// 为 TypeScript 添加全局类型定义
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl: (moduleId: string, label: string) => string
      getWorker?: (moduleId: string, label: string) => Worker
    }
  }
}
