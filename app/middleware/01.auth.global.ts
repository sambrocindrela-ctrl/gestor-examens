/**
 * Middleware that requires the user to be authenticated.
 */
export default defineNuxtRouteMiddleware(async () => {
  // Ignorem completament en el servidor per evitar 500 errors
  if (import.meta.server || process.server) return

  const nuxtApp = useNuxtApp()
  const $keycloak = nuxtApp.$keycloak as any

  if (!$keycloak) {
    console.warn('Keycloak no està disponible encara.')
    return
  }

  try {
    if (!$keycloak.authenticated) {
      console.log('Redirigint a login de Keycloak...')
      await $keycloak.login()
      return abortNavigation()
    }
  } catch (err) {
    console.error('Error intentant fer login amb Keycloak:', err)
  }
})
