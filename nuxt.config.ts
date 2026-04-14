// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"
export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2025-01-01',
  css: ['~/assets/css/App.css'],
  
  runtimeConfig: {
    API_BASE_URL: '', // S'injectarà via NUXT_API_BASE_URL
    public: {
      OIDC_CLIENT_ID: '', // Valor por defecto o inyectado vía NUXT_PUBLIC_OIDC_CLIENT_ID
      OIDC_BASE_URL: '',   // Valor por defecto o inyectado vía NUXT_PUBLIC_OIDC_BASE_URL
    }
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["local.dev.upc.edu"],
    },
  },
})
