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
    open: false,
    proxy: {
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
