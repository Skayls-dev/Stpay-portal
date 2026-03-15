import axios from 'axios'

export type ApiClientError = Error & {
  status?: number
  data?: unknown
  url?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5169'

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stpay_token') : null
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('stpay_api_key') : null
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    if (apiKey) {
      config.headers['X-Api-Key'] = apiKey
    }
    return config
  },
  (error) => Promise.reject(error),
)

const AUTH_STORAGE_KEYS = [
  'stpay_token',
  'stpay_user_id',
  'stpay_user_name',
  'stpay_user_role',
  'stpay_merchant_id',
]

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || '')
    const isPublicAuthCall =
      requestUrl.includes('/api/admin/login')
      || requestUrl.includes('/api/merchant/login')
      || requestUrl.includes('/api/merchant/register')

    if (error?.response?.status === 401 && !isPublicAuthCall) {
      AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
      window.location.href = '/choose-portal'
    }
    const message = error?.response?.data?.message || error?.response?.data?.Error || error?.message || 'Erreur API'
    const apiError = new Error(message) as ApiClientError
    apiError.status = error?.response?.status
    apiError.data = error?.response?.data
    apiError.url = requestUrl
    return Promise.reject(apiError)
  },
)

export default client
