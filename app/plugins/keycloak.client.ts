import Keycloak from 'keycloak-js'
import type { UserAuth } from '~/types/userAuth'

export default defineNuxtPlugin(async (nuxtApp) => {
  /**
   * Fix router issue, see : https://github.com/keycloak/keycloak/issues/14742
   */
  nuxtApp.hook('app:created', () => {
    const router = useRouter()
    router.currentRoute.value.query = {}
  })

  const configRT = useRuntimeConfig()
  
  if (!configRT.public.OIDC_BASE_URL || !configRT.public.OIDC_CLIENT_ID) {
    console.error('Configuració OIDC faltant. Verifica NUXT_PUBLIC_OIDC_BASE_URL i NUXT_PUBLIC_OIDC_CLIENT_ID.')
    return
  }

  const keycloak = new Keycloak({
    url: configRT.public.OIDC_BASE_URL,
    clientId: configRT.public.OIDC_CLIENT_ID,
    realm: 'upc'
  })

  // Inyectamos Keycloak antes del init para que el middleware lo encuentre (aunque no esté listo)
  nuxtApp.provide('keycloak', keycloak)

  try {
    await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      responseMode: 'query'
    })

    // Token refresh logic
    setInterval(() => {
      keycloak.updateToken(60).catch(() => {
        keycloak.login()
      })
    }, 30000)

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        keycloak.login()
      })
    }

    // State management for auth
    useState<UserAuth>('auth', () => ({
      isAuthenticated: !!keycloak.authenticated,
      profile: keycloak.tokenParsed || null
    }))
    
  } catch (err) {
    console.error('Error inicialitzant Keycloak:', err)
  }
})
