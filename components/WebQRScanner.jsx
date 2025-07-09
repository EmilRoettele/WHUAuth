import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { getResponsiveDimensions } from '../utils/dimensions'
import { getOptimalWebCameraConstraints, getBrowserCapabilities } from '../utils/platform'

const WebQRScanner = ({ onBarcodeScanned, style }) => {
  const [scannerState, setScannerState] = useState('loading') // 'loading' | 'ready' | 'denied' | 'error'
  const [message, setMessage] = useState('')
  const html5QrCodeRef = useRef(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    initializeScanner()
    
    return () => {
      cleanupScanner()
    }
  }, [])

  const initializeScanner = async () => {
    try {
      setScannerState('loading')
      
      // Check browser capabilities
      const capabilities = getBrowserCapabilities()
      if (!capabilities?.hasGetUserMedia) {
        setScannerState('error')
        setMessage('Camera not supported in this browser')
        return
      }

      // Initialize html5-qrcode
      html5QrCodeRef.current = new Html5Qrcode('web-qr-scanner')
      
      // Get available cameras
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        setScannerState('error')
        setMessage('No cameras found')
        return
      }

      // Choose back camera if available, otherwise use first camera
      const cameraId = cameras.length > 1 ? cameras[1].id : cameras[0].id
      const constraints = getOptimalWebCameraConstraints()

      // Configure scanner settings optimized for web
      const config = {
        fps: 10, // Balanced performance
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Use native API when available
        }
      }

      await html5QrCodeRef.current.start(
        cameraId,
        config,
        handleScanSuccess,
        handleScanError
      )

      setScannerState('ready')
      isInitializedRef.current = true
      
    } catch (error) {
      console.error('Scanner initialization error:', error)
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
        setScannerState('denied')
        setMessage('Camera permission denied')
      } else {
        setScannerState('error')
        setMessage('Camera initialization failed')
      }
    }
  }

  const handleScanSuccess = (decodedText, decodedResult) => {
    // Call the parent callback with the same format as native scanner
    if (onBarcodeScanned) {
      onBarcodeScanned({ data: decodedText, type: 'qr' })
    }
  }

  const handleScanError = (errorMessage) => {
    // Silently handle scan errors - they're very frequent and not important
    // Only log actual errors, not "No QR code found" messages
    if (!errorMessage.includes('QR code parse error') && !errorMessage.includes('No MultiFormat Readers')) {
      console.debug('Scan error:', errorMessage)
    }
  }

  const retryPermissions = async () => {
    cleanupScanner()
    await initializeScanner()
  }

  const cleanupScanner = async () => {
    if (html5QrCodeRef.current && isInitializedRef.current) {
      try {
        const state = html5QrCodeRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING) {
          await html5QrCodeRef.current.stop()
        }
        html5QrCodeRef.current.clear()
      } catch (error) {
        console.error('Cleanup error:', error)
      }
    }
    isInitializedRef.current = false
  }

  const renderPlaceholder = () => {
    let placeholderText = 'Initializing Camera'
    let placeholderSubtext = ''
    let showRetryButton = false

    switch (scannerState) {
      case 'loading':
        placeholderText = 'Initializing Camera'
        placeholderSubtext = 'Setting up web camera for QR scanning...'
        break
      case 'denied':
        placeholderText = 'Camera Permission Denied'
        placeholderSubtext = 'Allow camera access in browser settings'
        showRetryButton = true
        break
      case 'error':
        placeholderText = 'Camera Error'
        placeholderSubtext = message || 'Unable to access camera'
        showRetryButton = true
        break
    }

    return (
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.placeholderText}>{placeholderText}</Text>
        {placeholderSubtext && (
          <Text style={styles.placeholderSubtext}>{placeholderSubtext}</Text>
        )}
        {showRetryButton && (
          <TouchableOpacity style={styles.retryButton} onPress={retryPermissions}>
            <Text style={styles.retryButtonText}>Retry Permission</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      {scannerState !== 'ready' ? (
        renderPlaceholder()
      ) : (
        <>
          {/* html5-qrcode will render into this div */}
          <div
            id="web-qr-scanner"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          />
          
          {/* QR Code Outline - positioned over the scanner */}
          <View style={styles.qrOutline}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
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
    padding: 20,
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    minHeight: getResponsiveDimensions().minTouchTarget,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrOutline: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: '50%',
    left: '50%',
    marginTop: -100,
    marginLeft: -100,
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
})

export default WebQRScanner 