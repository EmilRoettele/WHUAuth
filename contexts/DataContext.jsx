import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import storageQueue from '../utils/StorageQueue'

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
  const [storageStatus, setStorageStatus] = useState({ processing: false, queueLength: 0 })

  // Storage keys
  const STORAGE_KEYS = {
    UPLOADED_DATA: 'whuauth_uploaded_data',
    UPLOADED_FILENAME: 'whuauth_uploaded_filename', 
    PROFILE: 'whuauth_profile'
  }

  // Load data on startup with background processing
  useEffect(() => {
    loadStoredData()
    setupStorageProgressTracking()
    
    return () => {
      // Cleanup storage progress listener
      storageQueue.removeProgressListener('dataContext')
    }
  }, [])

  const setupStorageProgressTracking = () => {
    storageQueue.addProgressListener('dataContext', (progress) => {
      setStorageStatus({
        processing: progress.status === 'processing',
        queueLength: progress.queueLength
      })
    })
  }

  const loadStoredData = async () => {
    try {
      console.log('Loading stored data in background...')
      
      // Load data using background queue for non-blocking operations
      const [storedData, storedFileName, storedProfile] = await Promise.all([
        storageQueue.getItem(STORAGE_KEYS.UPLOADED_DATA),
        storageQueue.getItem(STORAGE_KEYS.UPLOADED_FILENAME),
        storageQueue.getItem(STORAGE_KEYS.PROFILE)
      ])

      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          setUploadedData(Array.isArray(parsedData) ? parsedData : [])
          console.log(`Loaded ${parsedData.length} records from storage`)
        } catch (parseError) {
          console.error('Error parsing uploaded data:', parseError)
          setUploadedData([])
        }
      }
      
      if (storedFileName) {
        setUploadedFileName(storedFileName)
      }
      
      if (storedProfile) {
        try {
          const parsedProfile = JSON.parse(storedProfile)
          setProfile(parsedProfile)
        } catch (parseError) {
          console.error('Error parsing profile data:', parseError)
          setProfile({ userName: '' })
        }
      }
      
      console.log('Data loading completed successfully')
    } catch (error) {
      console.error('Error loading stored data:', error)
      // Set safe defaults on error
      setUploadedData([])
      setUploadedFileName('')
      setProfile({ userName: '' })
    }
  }

  const updateUploadedData = async (data, fileName) => {
    console.log(`Updating uploaded data: ${data.length} records, file: ${fileName}`)
    
    // Update UI immediately for responsive feel
    setUploadedData(data)
    setUploadedFileName(fileName)
    
    // Save to storage in background - non-blocking
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        storageQueue.setItem(STORAGE_KEYS.UPLOADED_DATA, data),
        storageQueue.setItem(STORAGE_KEYS.UPLOADED_FILENAME, fileName)
      ])
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some storage operations failed:', failures)
        // Data is still in memory, so app continues working
      } else {
        console.log('Data saved to storage successfully')
      }
    } catch (error) {
      console.error('Error saving uploaded data:', error)
      // App continues working with in-memory data
    }
  }

  const clearUploadedData = async () => {
    console.log('Clearing uploaded data')
    
    // Clear UI immediately for responsive feel
    setUploadedData([])
    setUploadedFileName('')
    
    // Clear from storage in background - non-blocking
    try {
      const results = await Promise.allSettled([
        storageQueue.removeItem(STORAGE_KEYS.UPLOADED_DATA),
        storageQueue.removeItem(STORAGE_KEYS.UPLOADED_FILENAME)
      ])
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some storage clear operations failed:', failures)
      } else {
        console.log('Data cleared from storage successfully')
      }
    } catch (error) {
      console.error('Error clearing uploaded data:', error)
      // UI is already cleared, so user doesn't see the error
    }
  }

  const updateProfile = async (newProfile) => {
    const updatedProfile = { ...profile, ...newProfile }
    console.log('Updating profile:', updatedProfile)
    
    // Update UI immediately for responsive feel
    setProfile(updatedProfile)
    
    // Save to storage in background - non-blocking
    try {
      await storageQueue.setItem(STORAGE_KEYS.PROFILE, updatedProfile)
      console.log('Profile saved to storage successfully')
    } catch (error) {
      console.error('Error saving profile:', error)
      // Profile is still updated in memory, so app continues working
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
    hasUploadedData: uploadedData.length > 0,
    storageStatus, // For UI progress indicators
    // Storage queue utilities
    getStorageQueueStatus: () => storageQueue.getStatus(),
    clearStorageQueue: () => storageQueue.clearQueue()
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export default DataContext 