import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { CameraView } from 'expo-camera'
import ProfileModal from '../components/ProfileModal'
import { useData } from '../contexts/DataContext'
import { useCameraContext } from '../contexts/CameraContext'
import { getResponsiveDimensions } from '../utils/dimensions'

const Scan = () => {
  const { findMatchByQRContent, hasUploadedData, profile } = useData()
  const { cameraStatus, retryPermissions } = useCameraContext()
  
  // Simplified state - just message and profile modal
  const [message, setMessage] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const lastScanRef = useRef('')
  const messageTimeoutRef = useRef(null)

  const getProfileLetter = () => {
    const name = profile.userName || 'User'
    return name.charAt(0).toUpperCase()
  }

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  const handleBarCodeScanned = ({ data }) => {
    // Simple debouncing - ignore if same QR scanned recently
    if (lastScanRef.current === data) return
    lastScanRef.current = data

    // Clear any existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
    }

    // Clear message after 2 seconds
    messageTimeoutRef.current = setTimeout(() => {
      setMessage('')
      lastScanRef.current = ''
    }, 2000)

    if (!hasUploadedData) {
      setMessage('Failure - No data uploaded')
      return
    }

    const searchResult = findMatchByQRContent(data)
    setMessage(searchResult.found 
      ? `Success! ${searchResult.match.name}` 
      : 'Failure - Not found'
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

      {/* Simple Message */}
      {message && (
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, 
            message.includes('Success') ? styles.successText : styles.failureText
          ]}>
            {message}
          </Text>
        </View>
      )}

      {/* Camera Container */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraFeed}>
          {cameraStatus === 'loading' && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Initializing Camera</Text>
            </View>
          )}
          
          {cameraStatus === 'denied' && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Camera Permission Denied</Text>
              <Text style={styles.placeholderSubtext}>
                {Platform.OS === 'web' 
                  ? 'Allow camera access in browser settings'
                  : 'Enable camera access in settings'
                }
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={retryPermissions}>
                <Text style={styles.retryButtonText}>Retry Permission</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {cameraStatus === 'ready' && (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarCodeScanned}
              />
              
              {/* QR Code Outline */}
              <View style={styles.qrOutline}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </>
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
  messageContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  successText: {
    color: '#059669',
  },
  failureText: {
    color: '#dc2626',
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