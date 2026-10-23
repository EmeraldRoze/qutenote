import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { postSocialAuthRoute } from '../lib/postAuthRoute'

export default function GoogleAuthSuccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      navigate('/login?error=google_failed')
      return
    }

    // new=1 means this sign-in just created the account: Google doesn't give
    // us a username, so brand-new people pick their handle first.
    const isNew = searchParams.get('new') === '1'

    localStorage.setItem('cn_token', token)
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        login(token, res.data.data)
        const dest = await postSocialAuthRoute(isNew, res.data.data)
        navigate(dest, dest === '/home' ? undefined : { replace: true, state: { provider: 'Google' } })
      })
      .catch(() => {
        navigate('/login?error=google_failed')
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
      <p style={{ fontSize: '15px', color: 'var(--ink-mid)', fontFamily: 'var(--font-body)' }}>Signing you in...</p>
    </div>
  )
}
