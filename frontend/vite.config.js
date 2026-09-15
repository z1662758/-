import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
const enableVueDevTools = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY)

export default defineConfig({
  plugins: [
    vue(),
    ...(enableVueDevTools ? [vueDevTools()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080, // 本地开发端口（对应 Vue CLI 的 devServer.port）
    strictPort: true, // 端口被占用时直接报错，不静默顺延到别的端口
    open: false,
    proxy: {
      // 长链路 LLM 端点（需求三段式 / 实验设计）：单独拉高超时，避免多段分析触发代理 502
      '/api/v1/requirement': {
        target: 'http://localhost:9091/',
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000
      },
      '/api/v1/experiment-design': {
        target: 'http://localhost:9091/',
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000
      },
      // v1 路由完整含 /api/v1 前缀（后端 backend/api/v1 蓝图带 /api），不做路径重写
      '/api/v1': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      },
      // 铀供应链事中：后端蓝图 url_prefix 就是 /api/uranium/during，不能被下面的通配 /api 规则去掉前缀
      '/api/uranium': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      },
      // 后端已包含 /api 前缀的路由，不做路径重写
      '/api/queue': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      },
      '/api/scenario': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      },
      '/api/ontology': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      },
      '/api/chat': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      },
      // K3-CHAT-1:Agent 对话 API(对话首页 Agent 研判)。后端蓝图 url_prefix=/api/agent,
      // 不做路径重写;SSE 长连接单独拉高超时,避免代理 502。
      '/api/agent': {
        target: 'http://localhost:9091/',
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000
      },
      // 其他 /api 开头的请求，移除 /api 前缀（后端路由不含 /api）
      '/api': {
        target: 'http://localhost:9091/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // OSINT 开源情报 + 供应链 API
      '/SCnet': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      },
      // 领域知识 /domain 路径
      '/domain': {
        target: 'http://localhost:9091/',
        changeOrigin: true
      }
    }
  },
})
