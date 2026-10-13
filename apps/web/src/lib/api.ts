import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cn_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only treat a 401 as "your session expired" if this request was actually
    // authenticated — a wrong-password attempt on /auth/login is also a 401,
    // but it's not a session expiring, and redirecting mid-attempt wiped the
    // real "Invalid email or password" message before the user could see it.
    const wasAuthenticated = !!err.config?.headers?.Authorization
    if (err.response?.status === 401 && wasAuthenticated) {
      localStorage.removeItem('cn_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
