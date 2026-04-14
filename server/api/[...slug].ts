// /server/api/[...slug].ts
import { useRuntimeConfig } from '#imports'
import type { H3Event } from 'h3'
import { getHeader, getHeaders, readBody, getQuery, createError } from 'h3'

export default defineEventHandler(async (event: H3Event): Promise<unknown> => {
  // Verifica autenticación (enviada desde el frontend via $authFetch)
  const auth = getHeader(event, 'Authorization')

  if (!auth?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Construye la URL destino
  const { API_BASE_URL } = useRuntimeConfig()
  const slug = [event.context.params?.slug].flat().filter(Boolean).join('/')

  // Django REST Framework suele requerir el slash final
  const url = `${API_BASE_URL}/${slug}/`

  // Método, headers y body
  type UpperHTTPMethod =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'
    | 'TRACE'
    | 'CONNECT'
  const method = (event.method || 'GET').toUpperCase() as UpperHTTPMethod
  
  // Filtramos cabeceras problemáticas o que deban ser regeneradas
  const headersEntries = Object.entries(getHeaders(event)).filter(
    ([k, v]) => typeof v === 'string' && k.toLowerCase() !== 'host'
  ) as [string, string][]
  
  const headers = Object.fromEntries(headersEntries)

  const body = !['GET', 'HEAD'].includes(method)
    ? await readBody(event)
    : undefined

  try {
    // Reenvía la solicitud
    return await $fetch<unknown>(url, {
      method,
      headers,
      body,
      query: getQuery(event)
    })
  } catch (err: any) {
    console.error(`Error forwarding request to ${url}:`, err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Backend Error',
      data: err.data
    })
  }
})
