import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: GitHub Pages(프로젝트 페이지)로 올리면 '/secworld/' 로 바꾼다. Vercel은 '/' 그대로
export default defineConfig({
  plugins: [react()],
  base: '/',
})
