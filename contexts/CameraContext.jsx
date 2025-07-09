import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Camera } from 'expo-camera'
import { Platform } from 'react-native'

const CameraContext = createContext()

export const useCameraContext = () => {
  const context = useContext(CameraContext)
  if (!context) {
    throw new Error('useCameraContext must be used within a CameraProvider')
  }
  return context
}

export const CameraProvider = ({ children }) => {
  const [hasPermission, setHasPermission] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const initializationRef = useRef(false)

  // Initialize camera once on app start
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) return
    initializationRef.current = true

    const initializeCamera = async () => {
      try {
        console.log('🎥 Initializing persistent camera...')
        const { status } = await Camera.requestCameraPermissionsAsync()
        console.log('🎥 Camera permission status:', status)
        
        setHasPermission(status === 'granted')
        setIsInitialized(true)

        if (status === 'denied' && Platform.OS === 'web') {
          console.log('🎥 Camera permission denied. User needs to check browser settings.')
        }
      } catch (error) {
        console.error('🎥 Camera initialization error:', error)
        setHasPermission(false)
        setIsInitialized(true)
      }
    }

    // Small delay to ensure app is ready, especially important for web
    const timeoutId = setTimeout(initializeCamera, Platform.OS === 'web' ? 100 : 50)

    return () => clearTimeout(timeoutId)
  }, [])

  // Retry camera permissions (for denied cases)
  const retryPermissions = async () => {
    try {
      console.log('🎥 Retrying camera permissions...')
      const { status } = await Camera.requestCameraPermissionsAsync()
      console.log('🎥 Retry permission status:', status)
      setHasPermission(status === 'granted')
    } catch (error) {
      console.error('🎥 Camera retry error:', error)
      setHasPermission(false)
    }
  }

  const value = {
    hasPermission,
    isInitialized,
    retryPermissions,
  }

  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  )
} 