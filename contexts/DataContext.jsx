import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DataContext = createContext()

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

export const DataProvider = ({ children }) => {
  const [uploadedData, setUploadedData] = useState([])
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [profile, setProfile] = useState({ userName: '' })

  // Storage keys
  const STORAGE_KEYS = {
    UPLOADED_DATA: 'whuauth_uploaded_data',
    UPLOADED_FILENAME: 'whuauth_uploaded_filename', 
    PROFILE: 'whuauth_profile'
  }

  // Load data on startup
  useEffect(() => {
    loadStoredData()
  }, [])

  const loadStoredData = async () => {
    try {
      const [storedData, storedFileName, storedProfile] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.UPLOADED_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.UPLOADED_FILENAME),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE)
      ])

      if (storedData) {
        setUploadedData(JSON.parse(storedData))
      }
      if (storedFileName) {
        setUploadedFileName(storedFileName)
      }
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile))
      }
    } catch (error) {
      // Silently handle storage errors in production
    }
  }

  const updateUploadedData = async (data, fileName) => {
    setUploadedData(data)
    setUploadedFileName(fileName)
    
    // Save to storage
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.UPLOADED_DATA, JSON.stringify(data)),
        AsyncStorage.setItem(STORAGE_KEYS.UPLOADED_FILENAME, fileName)
      ])
    } catch (error) {
      // Silently handle storage errors in production
    }
  }

  const clearUploadedData = async () => {
    setUploadedData([])
    setUploadedFileName('')
    
    // Clear from storage
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.UPLOADED_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.UPLOADED_FILENAME)
      ])
    } catch (error) {
      // Silently handle storage errors in production
    }
  }

  const updateProfile = async (newProfile) => {
    const updatedProfile = { ...profile, ...newProfile }
    setProfile(updatedProfile)
    
    // Save to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile))
    } catch (error) {
      // Silently handle storage errors in production
    }
  }

  const findMatchByQRContent = (qrContent) => {
    if (!qrContent || !uploadedData.length) {
      return {
        match: null,
        totalRecords: uploadedData.length,
        found: false
      }
    }

    // Simple normalization - trim and case-insensitive
    const normalize = (str) => str.toString().trim().toLowerCase()
    const searchTerm = normalize(qrContent)
    
    // Find exact match
    const match = uploadedData.find(item => 
      item.qrContent && normalize(item.qrContent) === searchTerm
    )

    return {
      match: match || null,
      totalRecords: uploadedData.length,
      found: !!match
    }
  }

  const value = {
    uploadedData,
    uploadedFileName,
    profile,
    updateUploadedData,
    clearUploadedData,
    updateProfile,
    findMatchByQRContent,
    hasUploadedData: uploadedData.length > 0
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export default DataContext 