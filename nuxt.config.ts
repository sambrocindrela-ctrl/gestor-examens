// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2025-01-01",
  css: ["~/assets/css/App.css"],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || "/",
    pageTransition: { name: "page", mode: "out-in" },
  },
  devServer: {
    port: 1024,
    host: "local.dev.upc.edu",
    https: true,
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        stream: "stream-browserify",
        buffer: "buffer",
      },
    },
    server: {
      allowedHosts: ["local.dev.upc.edu"],
    },
  },
  runtimeConfig: {
    API_BASE_URL: process.env.API_BASE_URL,
    public: {
      adminPassword: "",
      OIDC_CLIENT_ID: "",
      OIDC_BASE_URL: "",
      projectName:
        process.env.NUXT_PUBLIC_PROJECT_NAME || "Planificador d'exàmens",
      projectDescription:
        process.env.NUXT_PUBLIC_PROJECT_DESCRIPTION ||
        "períodes amb curs/quadrimestre",
    },
  },
  modules: ["nuxt-quasar-ui", "@nuxt/eslint"],
  quasar: {
    plugins: ["Dialog", "Notify", "Dark"],
    extras: {
      font: "roboto-font",
      fontIcons: ["material-symbols-outlined"],
    },
    components: {
      defaults: {
        QInput: {
          outlined: true,
          dense: true,
        },
        QSelect: {
          outlined: true,
          dense: true,
        },
        QBtn: {
          dense: false,
          noCaps: true,
          square: true,
        },
        QTable: {
          pagination: {
            rowsPerPage: 20,
          },
        },
        QPage: {
          padding: true,
        },
      },
    },
    config: {
      brand: {
        primary: "#007bc0",
        secondary: "#26A69A",
        accent: "#9C27B0",
        dark: "#1d1d1d",
        positive: "#007E33",
        negative: "#CC0000",
        info: "#31CCEC",
        warning: "#d14900",
      },
    },
  },
  nitro: {
    hooks: {
      close: () => {
        if (process.env.CI) {
          process.exit(0);
        }
      },
    },
  },
});
