import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { CameraView, Camera } from 'expo-camera'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ProfileModal from '../components/ProfileModal'

const { width, height } = Dimensions.get('window')

// Storage key (same as upload page)
const STORAGE_KEY = 'whuauth_uploaded_data'

// Responsive dimensions that work across platforms
const getResponsiveDimensions = () => {
  const isWeb = Platform.OS === 'web'
  const isTablet = width > 768
  
  return {
    // Horizontal padding based on screen size
    horizontalPadding: isWeb ? (isTablet ? 40 : 20) : 20,
    
    // Top padding consistent across pages, responsive to platform
    topPadding: isWeb ? (isTablet ? 60 : 40) : 50,
    
    // Camera/content width that's responsive
    contentWidth: isWeb 
      ? Math.min(width - (isTablet ? 120 : 80), 400) // Max 400px on web, responsive padding
      : width - 60, // Native mobile keeps current behavior
      
    // Bottom padding for tab bar
    bottomPadding: 140,
    
    // Responsive font sizes
    titleFontSize: isWeb ? (isTablet ? 28 : 24) : 24,
    subtitleFontSize: isWeb ? (isTablet ? 18 : 16) : 16,
    
    // Touch target improvements
    minTouchTarget: 44 // iOS HIG minimum touch target
  }
}

const Scan = () => {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [hasPermission, setHasPermission] = useState(null)
  const [scannedData, setScannedData] = useState('')
  const [isScanning, setIsScanning] = useState(true)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [matchResult, setMatchResult] = useState(null) // { success: boolean, message: string }
  const lastScanTime = useRef(0)

  // Handle tab focus/blur to manage camera lifecycle
  useFocusEffect(
    React.useCallback(() => {
      // When tab becomes focused
      console.log('Scan tab focused - activating camera')
      setIsCameraActive(true)
      setIsScanning(true)
      
      return () => {
        // When tab loses focus
        console.log('Scan tab unfocused - deactivating camera')
        setIsCameraActive(false)
        setScannedData('')
        setMatchResult(null)
      }
    }, [])
  )

  useEffect(() => {
    requestCameraPermission()
  }, [])

  const requestCameraPermission = async () => {
    try {
      console.log('Requesting camera permission...')
      const { status } = await Camera.requestCameraPermissionsAsync()
      console.log('Camera permission status:', status)
      setHasPermission(status === 'granted')
    } catch (error) {
      console.error('Camera permission error:', error)
      setHasPermission(false)
    }
  }

  // Load uploaded data from AsyncStorage
  const loadUploadedData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY)
      return storedData ? JSON.parse(storedData) : []
    } catch (error) {
      console.error('Error loading uploaded data:', error)
      return []
    }
  }

  // Find match in uploaded data
  const findQRMatch = async (scannedQR) => {
    const uploadedData = await loadUploadedData()
    
    if (!uploadedData || uploadedData.length === 0) {
      return { success: false, message: 'Failure! No data uploaded' }
    }

    // Normalize scanned QR for comparison
    const normalizedScanned = scannedQR.toString().trim().toLowerCase()
    
    // Search for match in QR Content columns
    for (const row of uploadedData) {
      const columns = Object.keys(row)
      
      // Find QR Content column
      const qrColumn = columns.find(col => 
        col.toLowerCase().includes('qr content')
      )
      
      if (qrColumn && row[qrColumn]) {
        const normalizedRow = row[qrColumn].toString().trim().toLowerCase()
        
        if (normalizedRow === normalizedScanned) {
          // Found match - get name from same row
          const nameColumn = columns.find(col => 
            col.toLowerCase().includes('name')
          )
          const name = nameColumn ? row[nameColumn] : 'Unknown'
          
          return { success: true, message: `Success! ${name}` }
        }
      }
    }
    
    return { success: false, message: 'Failure! No Match!' }
  }

  const handleBarcodeScanned = async ({ type, data }) => {
    // Internal scanning logic - camera stream stays continuous
    if (!isCameraActive || !isScanning) {
      return // Ignore scan but keep camera stream active
    }

    const currentTime = Date.now()
    
    // Debounce scanning - prevent duplicate scans within 2 seconds
    if (currentTime - lastScanTime.current < 2000) {
      return // Ignore scan but keep camera stream active
    }
    
    lastScanTime.current = currentTime
    
    console.log('QR Code scanned:', data)
    
    // Perform cross-reference check
    const result = await findQRMatch(data)
    
    // Batch state updates to reduce lag
    setScannedData(data)
    setMatchResult(result)
    setIsScanning(false)
    
    console.log('Match result:', result)
    
    // Re-enable scanning after 1 second
    setTimeout(() => {
      if (isCameraActive) {
        // Batch reset state updates
        setIsScanning(true)
        setScannedData('')
        setMatchResult(null)
      }
    }, 1000)
  }

  const getProfileLetter = () => {
    return 'U' // Default profile letter
  }

  const renderCamera = () => {
    // Don't render camera if tab is not active
    if (!isCameraActive) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>Camera paused</Text>
        </View>
      )
    }

    if (hasPermission === null) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>Requesting camera permission...</Text>
        </View>
      )
    }
    
    if (hasPermission === false) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>Camera access denied</Text>
          <TouchableOpacity style={styles.retryButton} onPress={requestCameraPermission}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>QR Code Scanner</Text>
          <Text style={styles.subtitle}>Position QR code within the frame</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileIcon} 
          onPress={() => setShowProfileModal(true)}
        >
          <View style={styles.profileIconCircle}>
            <Text style={styles.profileIconText}>{getProfileLetter()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Scan Result */}
      <View style={styles.messageSpace}>
        {matchResult && (
          <View style={[
            styles.resultContainer,
            matchResult.success ? styles.successContainer : styles.failureContainer
          ]}>
            <Text style={[
              styles.resultText,
              matchResult.success ? styles.successText : styles.failureText
            ]}>
              {matchResult.message}
            </Text>
          </View>
        )}
      </View>

      {/* Camera/Scanner Area */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraFrame}>
          {renderCamera()}
        </View>
        
        {/* Scanner Frame Overlay */}
        {hasPermission && isCameraActive && (
          <View style={styles.scannerFrame}>
            <View style={[styles.scannerCorner, styles.topLeft]} />
            <View style={[styles.scannerCorner, styles.topRight]} />
            <View style={[styles.scannerCorner, styles.bottomLeft]} />
            <View style={[styles.scannerCorner, styles.bottomRight]} />
          </View>
        )}
      </View>

      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </View>
  )
}

export default Scan

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: getResponsiveDimensions().horizontalPadding,
    paddingTop: getResponsiveDimensions().topPadding,
    paddingBottom: getResponsiveDimensions().bottomPadding,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  header: {
    flex: 1,
    alignItems: 'flex-start',
  },
  profileIcon: {
    marginTop: 8,
  },
  profileIconCircle: {
    width: Math.max(32, getResponsiveDimensions().minTouchTarget),
    height: Math.max(32, getResponsiveDimensions().minTouchTarget),
    borderRadius: Math.max(16, getResponsiveDimensions().minTouchTarget / 2),
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: getResponsiveDimensions().titleFontSize,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: getResponsiveDimensions().subtitleFontSize,
    color: '#666',
  },
  messageSpace: {
    height: 60,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successContainer: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  failureContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successText: {
    color: '#065f46',
  },
  failureText: {
    color: '#991b1b',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 20,
    marginBottom: 50,
  },
  cameraFrame: {
    width: getResponsiveDimensions().contentWidth,
    height: getResponsiveDimensions().contentWidth,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerFrame: {
    position: 'absolute',
    width: getResponsiveDimensions().contentWidth * 0.7,
    height: getResponsiveDimensions().contentWidth * 0.7,
  },
  scannerCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
})