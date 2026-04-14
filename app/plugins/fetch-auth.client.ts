export default defineNuxtPlugin(() => {
  const customFetch = $fetch.create({
    onRequest({ options }) {
      const { $keycloak } = useNuxtApp() as any
      const token = $keycloak?.idToken;

      const headers = new Headers(options.headers)

      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      options.headers = headers
    }
  })

  return {
    provide: {
      authFetch: customFetch
    }
  }
})
