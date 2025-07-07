import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, PanResponder } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { CameraView, Camera } from 'expo-camera'
import ProfileModal from '../components/ProfileModal'
import { useData } from '../contexts/DataContext'
import { router } from 'expo-router'

const { width } = Dimensions.get('window')

const Scan = () => {
  const { findMatchByQRContent, hasUploadedData, profile } = useData()
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'failure'
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [hasPermission, setHasPermission] = useState(null)
  const [messageKey, setMessageKey] = useState(0) // For animation trigger
  const messageTimeoutRef = useRef(null)

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

  useEffect(() => {
    getCameraPermissions()
  }, [])

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync()
    setHasPermission(status === 'granted')
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

    // Trigger animation by changing key
    setMessageKey(prev => prev + 1)
    setMessage(text)
    setMessageType(type)

    // Set new timeout to clear message after 1 second
    messageTimeoutRef.current = setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 1500)
  }

  const handleBarCodeScanned = ({ type, data }) => {
    // Check if uploaded data exists
    if (!hasUploadedData) {
      showMessage('Failure', 'failure')
      return
    }

    // Simple cross-check: Is the scanned content in the uploaded list?
    const matchedRecord = findMatchByQRContent(data)
    
    if (matchedRecord) {
      showMessage(`Success! ${matchedRecord.name}`, 'success')
    } else {
      showMessage('Failure', 'failure')
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
          {hasPermission === null && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Requesting Camera Permission</Text>
              <Text style={styles.placeholderSubtext}>Please allow camera access</Text>
            </View>
          )}
          
          {hasPermission === false && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Camera Permission Denied</Text>
              <Text style={styles.placeholderSubtext}>Enable camera access in settings</Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 140,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cameraContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  cameraFeed: {
    width: width - 60,
    height: width - 60,
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
})