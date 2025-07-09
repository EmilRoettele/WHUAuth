import React, { createContext, useContext, useState, useEffect } from 'react'
import { Camera } from 'expo-camera'

const CameraContext = createContext()

export const useCameraContext = () => {
  const context = useContext(CameraContext)
  if (!context) {
    throw new Error('useCameraContext must be used within a CameraProvider')
  }
  return context
}

export const CameraProvider = ({ children }) => {
  // Single status instead of dual hasPermission + isInitialized
  const [cameraStatus, setCameraStatus] = useState('loading') // 'loading' | 'ready' | 'denied'

  // Single initialization on app start
  useEffect(() => {
    const initializeCamera = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setCameraStatus(status === 'granted' ? 'ready' : 'denied')
    }

    initializeCamera()
  }, [])

  // Simple retry function
  const retryPermissions = async () => {
    setCameraStatus('loading')
    const { status } = await Camera.requestCameraPermissionsAsync()
    setCameraStatus(status === 'granted' ? 'ready' : 'denied')
  }

  const value = {
    cameraStatus,
    retryPermissions,
  }

  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  )
} 