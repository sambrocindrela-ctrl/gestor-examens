// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"
export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2025-01-01',
  css: ['~/assets/css/App.css'],
  
 vite: {
  plugins: [tailwindcss()],
 }
})
