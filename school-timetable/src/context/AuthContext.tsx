import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthContextType, School } from '../types'
import api from '../services/api'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for stored token on mount
  useEffect(() => {
    // Check both possible keys for backward compatibility
    const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
      } catch (err) {
        console.error('Failed to parse stored user:', err)
        localStorage.removeItem('authToken')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await api.login(username, password)
      // API returns "access" not "access_token"
      const { access, user: userData, status, device_id } = response.data

      if (status === 'pending_approval') {
        throw new Error(`Device pending approval. Device ID: ${device_id}`)
      }

      // Store in both keys for compatibility with different parts of the app
      localStorage.setItem('authToken', access)
      localStorage.setItem('token', access)
      localStorage.setItem('user', JSON.stringify(userData))

      setToken(access)
      setUser(userData)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setSchool(null)
  }

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('No refresh token')

      const response = await api.refreshAccessToken(refreshToken)
      const { access_token } = response.data

      localStorage.setItem('authToken', access_token)
      localStorage.setItem('token', access_token)
      setToken(access_token)
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    school,
    token,
    loading,
    login,
    logout,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
