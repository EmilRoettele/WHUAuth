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
      console.error('Error loading stored data:', error)
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
      console.error('Error saving uploaded data:', error)
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
      console.error('Error clearing uploaded data:', error)
    }
  }

  const updateProfile = async (newProfile) => {
    const updatedProfile = { ...profile, ...newProfile }
    setProfile(updatedProfile)
    
    // Save to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile))
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

  const findMatchByQRContent = (qrContent) => {
    if (!qrContent || !uploadedData.length) return null

    // Enhanced normalization for better matching
    const normalizeString = (str) => {
      return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/[^\w\s]/g, '') // Remove special characters except letters, numbers, spaces
    }

    const normalizedSearch = normalizeString(qrContent)
    
    console.log('Searching for QR content:', {
      original: qrContent,
      normalized: normalizedSearch,
      totalRecords: uploadedData.length
    })

    // Try exact match first
    let match = uploadedData.find(item => 
      item.qrContent && normalizeString(item.qrContent) === normalizedSearch
    )

    // If no exact match, try partial matches (useful for QR codes with extra formatting)
    if (!match) {
      match = uploadedData.find(item => 
        item.qrContent && (
          normalizeString(item.qrContent).includes(normalizedSearch) ||
          normalizedSearch.includes(normalizeString(item.qrContent))
        )
      )
    }

    console.log('Match result:', match || 'No match found')
    return match
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