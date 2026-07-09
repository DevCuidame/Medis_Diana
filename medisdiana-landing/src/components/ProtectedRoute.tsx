import { Navigate, useLocation } from 'react-router-dom'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const token = localStorage.getItem('accessToken')
  const location = useLocation()

  if (!token) {
    // Redirect to login, preserve intended destination so we can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      const userRole = payload.role;

      if (!allowedRoles.includes(userRole)) {
        if (userRole === 'USER') return <Navigate to="/user/dashboard" replace />
        if (userRole === 'PROFESSIONAL') return <Navigate to="/professional/classes" replace />
        return <Navigate to="/admin/dashboard" replace />
      }
    } catch (e) {
      return <Navigate to="/login" replace />
    }
  }

  return <>{children}</>
}
