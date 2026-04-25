import axios from 'axios'
import toast from 'react-hot-toast'

export type ApiClientError = Error & {
  status?: number
  code?: string
  data?: unknown
  url?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE ?? ''
let hasShownPsiRequiredToast = false

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
  'stpay_portal_role',
  'stpay_psi_accepted',
]

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // No response means the backend is unreachable (down / restarted / network issue)
    if (!error?.response) {
      window.dispatchEvent(new CustomEvent('stpay:backend-unreachable'))
    }

    const requestUrl = String(error?.config?.url || '')
    const responseMessage = String(error?.response?.data?.message || error?.response?.data?.Error || '').toLowerCase()
    const isApiKeyAuthFailure = responseMessage.includes('api key')
    const isPublicAuthCall =
      requestUrl.includes('/api/admin/login')
      || requestUrl.includes('/api/merchant/login')
      || requestUrl.includes('/api/merchant/register')

    if (error?.response?.status === 401 && !isPublicAuthCall && !isApiKeyAuthFailure) {
      AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
      window.location.href = '/choose-portal'
    }
    const errorCode = String(error?.response?.data?.code || error?.response?.data?.errorCode || '')
    const isPsiRequired = error?.response?.status === 403 && errorCode === 'PSI_REQUIRED'

    if (isPsiRequired && !hasShownPsiRequiredToast) {
      hasShownPsiRequiredToast = true
      toast.error('Veuillez lire et accepter la PSI pour continuer.')
    }

    const message = error?.response?.data?.message || error?.response?.data?.Error || error?.message || 'Erreur API'
    const apiError = new Error(message) as ApiClientError
    apiError.status = error?.response?.status
    apiError.code = errorCode || undefined
    apiError.data = error?.response?.data
    apiError.url = requestUrl
    return Promise.reject(apiError)
  },
)

export default client
