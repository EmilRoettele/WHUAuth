import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, PanResponder, Platform } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { CameraView } from 'expo-camera'
import ProfileModal from '../components/ProfileModal'
import { useData } from '../contexts/DataContext'
import { useCameraContext } from '../contexts/CameraContext'
import { router } from 'expo-router'

const { width, height } = Dimensions.get('window')

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
  const { findMatchByQRContent, hasUploadedData, profile, uploadedData } = useData()
  const { hasPermission, isInitialized, retryPermissions } = useCameraContext()
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'failure'
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [messageKey, setMessageKey] = useState(0) // For animation trigger
  const [scannedData, setScannedData] = useState(null) // For scan debouncing
  const messageTimeoutRef = useRef(null)
  const lastScanTimeRef = useRef(0)

  // Swipe navigation
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only activate on horizontal swipes that are significant
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 100
      },
      onPanResponderMove: (evt, gestureState) => {
        // Optional: Add visual feedback during swipe
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Swipe right to go to Upload page
        if (gestureState.dx > 100 && Math.abs(gestureState.vx) > 0.5) {
          router.push('/upload')
        }
      },
    })
  ).current

  // Reset scan state when camera becomes available or app loads
  useEffect(() => {
    if (hasPermission) {
      console.log('🎥 Camera ready - resetting scan state')
      resetScanState()
    }
  }, [hasPermission])

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  // Retry function that uses camera context
  const handleRetryPermissions = () => {
    console.log('🎥 User requested permission retry')
    resetScanState() // Clear any previous scan state
    retryPermissions() // Use context retry function
  }

  // Helper function to reset scan state (useful for debugging)
  const resetScanState = () => {
    console.log('Resetting scan state')
    setScannedData(null)
    lastScanTimeRef.current = 0
    setMessage('')
    setMessageType('')
  }

  const getProfileLetter = () => {
    const name = profile.userName || 'User'
    return name.charAt(0).toUpperCase()
  }

  const showMessage = (text, type) => {
    // Clear any existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
    }

    console.log('Showing message:', { text, type })

    // Trigger animation by changing key
    setMessageKey(prev => prev + 1)
    setMessage(text)
    setMessageType(type)

    // Shorter timeout to prevent interference with rapid scanning
    messageTimeoutRef.current = setTimeout(() => {
      setMessage('')
      setMessageType('')
      console.log('Message cleared')
    }, 1200) // Reduced from 1500ms to 1200ms
  }

  const handleBarCodeScanned = ({ type, data }) => {
    const currentTime = Date.now()
    
    // Debouncing: Ignore scans that are too rapid or duplicate
    if (
      scannedData === data && 
      currentTime - lastScanTimeRef.current < 2000 // 2 second cooldown
    ) {
      console.log('Ignoring duplicate scan:', data)
      return
    }

    // Update scan tracking
    setScannedData(data)
    lastScanTimeRef.current = currentTime

    console.log('QR Code detected:', {
      type,
      data,
      timestamp: new Date().toISOString(),
      hasUploadedData
    })

    // Check if uploaded data exists
    if (!hasUploadedData) {
      console.log('No uploaded data - showing failure')
      showMessage('Failure - No data uploaded', 'failure')
      return
    }

    // Enhanced cross-check with better string normalization
    const matchedRecord = findMatchByQRContent(data)
    
    console.log('QR matching result:', {
      searchData: data,
      found: !!matchedRecord,
      matchedRecord: matchedRecord || 'none',
      totalRecords: uploadedData.length
    })
    
    if (matchedRecord) {
      showMessage(`Success! ${matchedRecord.name}`, 'success')
    } else {
      showMessage('Failure - Not found', 'failure')
    }
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
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

      {/* Fixed Message Space - always reserves space so camera doesn't move */}
      <View style={styles.messageSpace}>
        {message && (
          <View 
            key={messageKey}
            style={[
              styles.messageBox, 
              messageType === 'success' ? styles.successMessage : styles.failureMessage,
              styles.messageAnimation
            ]}
          >
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}
      </View>

      {/* Camera Container with QR Outline */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraFeed}>
          {!isInitialized && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Initializing Camera</Text>
              <Text style={styles.placeholderSubtext}>Setting up camera stream...</Text>
            </View>
          )}

          {isInitialized && hasPermission === null && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Requesting Camera Permission</Text>
              <Text style={styles.placeholderSubtext}>Please allow camera access</Text>
            </View>
          )}
          
          {isInitialized && hasPermission === false && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Camera Permission Denied</Text>
              <Text style={styles.placeholderSubtext}>
                {Platform.OS === 'web' 
                  ? 'Click the lock icon in your browser address bar and allow camera access, then retry.'
                  : 'Enable camera access in settings'
                }
              </Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={handleRetryPermissions}
              >
                <Text style={styles.retryButtonText}>Retry Permission</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {hasPermission && (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            />
          )}
          
          {/* QR Code Outline - always show when camera is active */}
          {hasPermission && (
            <View style={styles.qrOutline}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          )}
        </View>
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
    marginBottom: 30,
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
    textAlign: 'left', // Consistent left alignment for both pages
  },
  cameraContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  cameraFeed: {
    width: getResponsiveDimensions().contentWidth,
    height: getResponsiveDimensions().contentWidth,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  qrOutline: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#2563eb',
    borderWidth: 2,
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
  messageSpace: {
    height: 60,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBox: {
    width: getResponsiveDimensions().contentWidth,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successMessage: {
    backgroundColor: '#f0f9ff',
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  failureMessage: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  messageAnimation: {
    transform: [{ scale: 1.05 }],
    // Simple pop-in effect - slightly larger scale for emphasis
  },
  retryButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    minHeight: getResponsiveDimensions().minTouchTarget,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})