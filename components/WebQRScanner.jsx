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
  const scannerContainerRef = useRef(null)

  useEffect(() => {
    console.log('WebQRScanner: Component mounted, starting initialization')
    initializeScanner()
    
    return () => {
      console.log('WebQRScanner: Component unmounting, cleaning up scanner')
      cleanupScanner()
    }
  }, [])

  const initializeScanner = async () => {
    try {
      console.log('WebQRScanner: Starting initialization')
      setScannerState('loading')
      
      // Check browser capabilities
      console.log('WebQRScanner: Checking browser capabilities')
      const capabilities = getBrowserCapabilities()
      console.log('WebQRScanner: Browser capabilities:', capabilities)
      
      if (!capabilities?.hasGetUserMedia) {
        console.error('WebQRScanner: getUserMedia not supported')
        setScannerState('error')
        setMessage('Camera not supported in this browser')
        return
      }

      // Wait a bit for the DOM element to be ready
      console.log('WebQRScanner: Waiting for DOM element to be ready')
      await new Promise(resolve => setTimeout(resolve, 500)) // Increased timeout

      // Get the container element from React Native Web
      console.log('WebQRScanner: Getting scanner container ref')
      if (!scannerContainerRef.current) {
        console.error('WebQRScanner: Scanner container ref is null')
        setScannerState('error')
        setMessage('Scanner container not ready')
        return
      }

      // Create a unique ID for this scanner instance
      const scannerId = `web-qr-scanner-${Date.now()}`
      console.log('WebQRScanner: Created scanner ID:', scannerId)
      
      // Get the underlying DOM element from React Native Web
      const containerElement = scannerContainerRef.current
      console.log('WebQRScanner: Container element:', containerElement)
      containerElement.id = scannerId

      // Initialize html5-qrcode with the container element
      console.log('WebQRScanner: Initializing Html5Qrcode')
      html5QrCodeRef.current = new Html5Qrcode(scannerId)
      
      // Get available cameras
      console.log('WebQRScanner: Getting available cameras')
      const cameras = await Html5Qrcode.getCameras()
      console.log('WebQRScanner: Available cameras:', cameras)
      
      if (!cameras || cameras.length === 0) {
        console.error('WebQRScanner: No cameras found')
        setScannerState('error')
        setMessage('No cameras found')
        return
      }

      // Choose back camera if available, otherwise use first camera
      const cameraId = cameras.length > 1 ? cameras[1].id : cameras[0].id
      console.log('WebQRScanner: Selected camera ID:', cameraId)
      
      const constraints = getOptimalWebCameraConstraints()
      console.log('WebQRScanner: Camera constraints:', constraints)

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
      console.log('WebQRScanner: Scanner config:', config)

      console.log('WebQRScanner: Starting camera stream')
      await html5QrCodeRef.current.start(
        cameraId,
        config,
        handleScanSuccess,
        handleScanError
      )

      console.log('WebQRScanner: Camera started successfully')
      setScannerState('ready')
      isInitializedRef.current = true
      
    } catch (error) {
      console.error('WebQRScanner: Scanner initialization error:', error)
      console.error('WebQRScanner: Error name:', error.name)
      console.error('WebQRScanner: Error message:', error.message)
      console.error('WebQRScanner: Error stack:', error.stack)
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
        console.log('WebQRScanner: Setting state to denied due to permission error')
        setScannerState('denied')
        setMessage('Camera permission denied')
      } else {
        console.log('WebQRScanner: Setting state to error due to other error')
        setScannerState('error')
        setMessage('Camera initialization failed: ' + error.message)
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
          {/* html5-qrcode will render into this View */}
          <View
            ref={scannerContainerRef}
            style={styles.scannerContainer}
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
  scannerContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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