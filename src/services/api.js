/**
 * Canteena API Service Wrapper
 * Built using native fetch with in-flight GET deduplication and request timeouts.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const DEFAULT_TIMEOUT_MS = 15000
const inflightGetRequests = new Map()

export class ApiError extends Error {
  constructor(message, status = 500, errors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

/**
 * Perform an authenticated HTTP request
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const method = (options.method || 'GET').toUpperCase()
  const token = localStorage.getItem('canteena_token')

  if (method === 'GET' && !options.skipDedup && !options.signal) {
    const dedupKey = `${url}::${token || ''}`
    if (inflightGetRequests.has(dedupKey)) {
      return inflightGetRequests.get(dedupKey)
    }

    const sharedPromise = executeFetch(url, options, token).finally(() => {
      inflightGetRequests.delete(dedupKey)
    })
    inflightGetRequests.set(dedupKey, sharedPromise)
    return sharedPromise
  }

  return executeFetch(url, options, token)
}

async function executeFetch(url, options, token) {
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // Handle FormData differently (let browser set multipart/form-data boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = !options.signal ? new AbortController() : null
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller?.signal,
    })

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const data = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      const errorMessage =
        (isJson && data?.message) ||
        (isJson && data?.error) ||
        `Request failed with status ${response.status}`
      const validationErrors = (isJson && data?.errors) || {}
      throw new ApiError(errorMessage, response.status, validationErrors)
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error?.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 408)
    }
    throw new ApiError(error.message || 'Network error occurred', 0)
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export const api = {
  get(endpoint, options = {}) {
    return request(endpoint, { method: 'GET', ...options })
  },

  post(endpoint, data = {}, options = {}) {
    const isFormData = data instanceof FormData
    return request(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      ...options,
    })
  },

  put(endpoint, data = {}, options = {}) {
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    })
  },

  patch(endpoint, data = {}, options = {}) {
    return request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    })
  },

  delete(endpoint, options = {}) {
    return request(endpoint, { method: 'DELETE', ...options })
  },

  upload(endpoint, formData, options = {}) {
    return request(endpoint, {
      method: 'POST',
      body: formData,
      ...options,
    })
  },
}

export default api
