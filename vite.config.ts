import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon.png', 'apple-touch-icon.png', 'sample-import.csv'],
      manifest: {
        name: 'ใครช่วยใครพลัส — KraiChuayKrai+',
        short_name: 'ใครช่วยใคร+',
        description: 'แอปจดบันทึกรายจ่ายและสิทธิ์รัฐช่วยจ่าย แบบ Local-First พร้อมสแกนสลิปออฟไลน์',
        theme_color: '#2563eb',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'th',
        icons: [
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
        shortcuts: [
          {
            name: 'เพิ่มรายการ / สแกนสลิป',
            short_name: 'เพิ่มรายการ',
            url: '/add',
            icons: [{ src: '/icon.png', sizes: '512x512' }],
          },
          {
            name: 'สรุปและวิเคราะห์',
            short_name: 'สรุป',
            url: '/insights',
            icons: [{ src: '/icon.png', sizes: '512x512' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,csv}'],
        globIgnores: ['tesseract/**'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^\/tesseract\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-offline-assets',
              expiration: {
                maxEntries: 25,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5174,
  },
});
