import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, PanResponder, Platform, AppState, TextInput } from 'react-native'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CameraView, Camera } from 'expo-camera'
import { useFocusEffect } from 'expo-router'
import { useData } from '../contexts/DataContext'
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
  const { findMatchByQRContent, hasUploadedData, profile, updateProfile } = useData()
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'failure'
  const [hasPermission, setHasPermission] = useState(null)
  const [messageKey, setMessageKey] = useState(0) // For animation trigger
  const [scannedData, setScannedData] = useState(null) // For scan debouncing
  const [isCameraReady, setIsCameraReady] = useState(false) // Track camera readiness
  const [isCameraActive, setIsCameraActive] = useState(true) // Control camera activity without destroying
  const [cameraKey, setCameraKey] = useState(0) // Force camera remount only when necessary
  const [appState, setAppState] = useState(AppState.currentState) // Track app lifecycle
  const [isTabFocused, setIsTabFocused] = useState(true) // Track tab focus state
  const messageTimeoutRef = useRef(null)
  const lastScanTimeRef = useRef(0)
  const cameraRef = useRef(null) // Reference to camera component
  const appStateRef = useRef(AppState.currentState) // Reference for cleanup
  const [cameraConstraints, setCameraConstraints] = useState(null) // Platform-specific camera settings
  const [browserInfo, setBrowserInfo] = useState({ detected: false, name: '', version: '' })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileNameInput, setProfileNameInput] = useState(profile.userName || '')

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

  // Initialize camera permissions and platform optimizations on mount
  useEffect(() => {
    setupPlatformOptimizations()
    getCameraPermissions()
  }, [])

  // Platform-specific optimizations
  const setupPlatformOptimizations = () => {
    if (Platform.OS === 'web') {
      setupWebOptimizations()
    } else {
      setupNativeOptimizations()
    }
  }

  // Web-specific camera and browser optimizations
  const setupWebOptimizations = () => {
    // Detect browser for specific optimizations
    const detectBrowser = () => {
      const userAgent = navigator.userAgent
      let browserName = 'Unknown'
      let version = ''

      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        browserName = 'Chrome'
        version = userAgent.match(/Chrome\/(\d+)/)?.[1] || ''
      } else if (userAgent.includes('Firefox')) {
        browserName = 'Firefox'  
        version = userAgent.match(/Firefox\/(\d+)/)?.[1] || ''
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browserName = 'Safari'
        version = userAgent.match(/Version\/(\d+)/)?.[1] || ''
      } else if (userAgent.includes('Edg')) {
        browserName = 'Edge'
        version = userAgent.match(/Edg\/(\d+)/)?.[1] || ''
      }

      setBrowserInfo({ detected: true, name: browserName, version })
      console.log(`Detected browser: ${browserName} ${version}`)
      return { name: browserName, version }
    }

    const browser = detectBrowser()

    // Set optimal camera constraints based on browser capabilities
    const constraints = {
      video: {
        facingMode: 'environment', // Back camera preferred
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      }
    }

    // Browser-specific optimizations
    if (browser.name === 'Chrome') {
      // Chrome supports advanced constraints
      constraints.video.focusMode = 'continuous'
      constraints.video.whiteBalanceMode = 'auto'
      if (parseInt(browser.version) >= 90) {
        constraints.video.torch = false // Disable torch by default
      }
    } else if (browser.name === 'Firefox') {
      // Firefox has different constraint support
      constraints.video.width = { ideal: 1024 }
      constraints.video.height = { ideal: 576 }
    } else if (browser.name === 'Safari') {
      // Safari iOS constraints
      constraints.video.width = { ideal: 960 }
      constraints.video.height = { ideal: 540 }
      constraints.video.frameRate = { ideal: 24, max: 30 }
    }

    setCameraConstraints(constraints)
    console.log('Web camera constraints set:', constraints)

    // Check for specific web limitations
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.warn('Camera requires HTTPS in production browsers')
    }

    // Detect incognito/private browsing (affects camera permissions)
    const detectIncognito = () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(data => {
          if (data.quota < 120000000) { // Less than ~120MB suggests incognito
            console.warn('Possible incognito mode detected - camera may have limitations')
          }
        })
      }
    }
    detectIncognito()
  }

  // Native-specific optimizations
  const setupNativeOptimizations = () => {
    console.log(`Setting up optimizations for ${Platform.OS}`)
    
    // iOS-specific optimizations
    if (Platform.OS === 'ios') {
      setCameraConstraints({
        // iOS camera settings
        quality: 'high',
        orientation: 'portrait',
        fixOrientation: true,
        forceUpOrientation: false
      })
    } 
    // Android-specific optimizations
    else if (Platform.OS === 'android') {
      setCameraConstraints({
        // Android camera settings
        quality: 'high',
        correctOrientation: true,
        saveToPhotos: false
      })
    }
  }

  // App lifecycle management for resource cleanup
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changing:', appStateRef.current, '->', nextAppState)
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App returning to foreground - resuming camera if needed')
        // App returning to foreground
        if (isTabFocused && hasPermission) {
          setIsCameraActive(true)
          setIsCameraReady(true)
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('App going to background - pausing camera resources')
        // App going to background - pause camera to free resources
        setIsCameraActive(false)
        // Clear any active timeouts to prevent memory leaks
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
          messageTimeoutRef.current = null
        }
      }
      
      appStateRef.current = nextAppState
      setAppState(nextAppState)
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    
    return () => {
      subscription?.remove()
    }
  }, [isTabFocused, hasPermission])

  // Smart focus management with context-aware state handling
  useFocusEffect(
    useCallback(() => {
      console.log('Scan tab focused - managing camera state')
      setIsTabFocused(true)
      
      // Only activate if app is in foreground and we have permissions
      const shouldActivate = appState === 'active' && hasPermission === true
      
      if (shouldActivate) {
        console.log('Activating camera - app active and permissions granted')
        setIsCameraActive(true)
        setIsCameraReady(true)
        // Only reset scan state if there's a stale scan (older than 10 seconds)
        const timeSinceLastScan = Date.now() - lastScanTimeRef.current
        if (timeSinceLastScan > 10000) {
          console.log('Clearing stale scan state')
          setScannedData(null)
        }
      } else if (hasPermission === false || hasPermission === null) {
        console.log('Checking permissions on focus')
        // Small delay to ensure smooth transition
        const timeoutId = setTimeout(() => {
          getCameraPermissions()
        }, 100)
        
        return () => clearTimeout(timeoutId)
      }

      return () => {
        console.log('Scan tab unfocused - preserving state context')
        setIsTabFocused(false)
        // Only pause camera, preserve scan state for quick resume
        setIsCameraActive(false)
        // Don't clear message immediately - let user see result when returning
        // Only clear very old messages
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
          messageTimeoutRef.current = setTimeout(() => {
            setMessage('')
            setMessageType('')
          }, 5000) // Extended timeout when switching tabs
        }
      }
    }, [hasPermission, appState]) // Depend on permission and app state
  )

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up resources')
      cleanupResources()
    }
  }, [])

  const getCameraPermissions = async () => {
    try {
      console.log('Checking camera permissions...')
      
      // First check current status without requesting
      const currentStatus = await Camera.getCameraPermissionsAsync()
      console.log('Current camera permission status:', currentStatus.status)
      
      let finalStatus = currentStatus.status
      
      // Only request permissions if status is undetermined
      if (currentStatus.status === 'undetermined') {
        console.log('Permissions undetermined - requesting...')
        const requestResult = await Camera.requestCameraPermissionsAsync()
        finalStatus = requestResult.status
        console.log('Permission request result:', finalStatus)
      }
      
             const hasAccess = finalStatus === 'granted'
      setHasPermission(hasAccess)
      
      if (hasAccess) {
        // Don't immediately set camera as ready - let onCameraReady handle it
        setIsCameraActive(true)
        console.log('Permissions granted - camera will initialize')
      } else {
        setIsCameraReady(false)
        setIsCameraActive(false)
      }
      
      // Only clear scan data if this is a fresh permission grant
      if (hasAccess && currentStatus.status === 'undetermined') {
        console.log('Fresh permission granted - resetting state')
        resetScanState('permission-change')
      }
      
      // Provide platform-specific guidance for denied permissions
      if (finalStatus === 'denied') {
        const guidance = getPlatformSpecificGuidance()
        console.log(`Camera permission denied. ${guidance}`)
      }
      
      return hasAccess
    } catch (error) {
      console.error('Camera permission error:', error)
      setHasPermission(false)
      return false
    }
  }

    // Platform-specific permission guidance
  const getPlatformSpecificGuidance = () => {
    if (Platform.OS === 'web') {
      const browser = browserInfo.name
      switch (browser) {
        case 'Chrome':
          return 'Click the camera icon in the address bar, or go to Settings > Privacy > Site Settings > Camera'
        case 'Firefox':
          return 'Click the camera icon in the address bar, or check Preferences > Privacy > Permissions > Camera'
        case 'Safari':
          return 'Go to Safari > Preferences > Websites > Camera, or check Privacy & Security settings'
        case 'Edge':
          return 'Click the camera icon in the address bar, or go to Settings > Cookies and site permissions > Camera'
        default:
          return 'Check your browser\'s camera permissions in settings and allow access for this site'
      }
    } else if (Platform.OS === 'ios') {
      return 'Go to Settings > Privacy & Security > Camera > [App Name] and enable camera access'
    } else if (Platform.OS === 'android') {
      return 'Go to Settings > Apps > [App Name] > Permissions > Camera and allow access'
    }
    return 'Enable camera access in your device settings'
  }

  // Enhanced error recovery with platform-specific handling
  const handleCameraError = (error, context = 'general') => {
    console.error(`Camera error in ${context}:`, error)
    
    if (Platform.OS === 'web') {
      // Web-specific error handling
      if (error.name === 'NotAllowedError') {
        return 'Camera access denied. Please allow camera permissions and refresh the page.'
      } else if (error.name === 'NotFoundError') {
        return 'No camera found. Please ensure a camera is connected and try again.'
      } else if (error.name === 'NotReadableError') {
        return 'Camera is being used by another application. Please close other camera apps and try again.'
      } else if (error.name === 'OverconstrainedError') {
        return 'Camera settings not supported. Trying with fallback settings...'
      } else if (error.name === 'SecurityError') {
        return 'Camera access blocked due to security restrictions. Please use HTTPS or check browser settings.'
      }
    } else {
      // Native-specific error handling
      if (error.code === 'camera_unavailable') {
        return 'Camera is currently unavailable. Please try again in a moment.'
      } else if (error.code === 'permission_denied') {
        return 'Camera permission denied. Please enable camera access in settings.'
      } else if (error.code === 'device_not_supported') {
        return 'Camera not supported on this device.'
      }
    }
    
    return 'Camera error occurred. Please try again.'
  }

  // Smart retry function with proper resource management
  const retryPermissions = async () => {
    console.log('Retrying camera permissions...')
    resetScanState('manual') // Clear any previous scan state
    
    // Force a fresh permission request for retry scenarios
    try {
      const { status } = await Camera.requestCameraPermissionsAsync()
      console.log('Retry permission result:', status)
      const hasAccess = status === 'granted'
      setHasPermission(hasAccess)
      
      if (hasAccess) {
        // Only activate if app is in foreground and tab is focused
        const shouldActivate = appState === 'active' && isTabFocused
        if (shouldActivate) {
          setIsCameraActive(true)
          console.log('Retry successful - camera activated')
        }
        resetScanState('permission-change')
      } else {
        setIsCameraReady(false)
        setIsCameraActive(false)
      }
    } catch (error) {
      console.error('Permission retry error:', error)
      setHasPermission(false)
      setIsCameraReady(false)
      setIsCameraActive(false)
    }
  }

  // Smart state reset with context awareness
  const resetScanState = (reason = 'manual') => {
    console.log(`Resetting scan state - reason: ${reason}`)
    setScannedData(null)
    lastScanTimeRef.current = 0
    
    // Only clear UI messages for certain reset reasons
    if (reason === 'manual' || reason === 'permission-change' || reason === 'app-restart') {
      setMessage('')
      setMessageType('')
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
        messageTimeoutRef.current = null
      }
    }
  }

  // Comprehensive cleanup function
  const cleanupResources = () => {
    console.log('Cleaning up all camera resources')
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
      messageTimeoutRef.current = null
    }
    setIsCameraActive(false)
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

    // Context-aware timeout - longer for important messages
    const timeout = type === 'success' ? 2000 : 1500 // Success messages show longer
    messageTimeoutRef.current = setTimeout(() => {
      // Only clear if still on the same tab and app is active
      if (isTabFocused && appState === 'active') {
        setMessage('')
        setMessageType('')
        console.log('Message cleared after timeout')
      }
    }, timeout)
  }

  // Handle camera lifecycle events
  const handleCameraReady = () => {
    console.log('Camera stream ready')
    setIsCameraReady(true)
  }

  const handleCameraMountError = (error) => {
    const errorMessage = handleCameraError(error, 'mount')
    console.error('Camera mount error:', errorMessage)
    setIsCameraReady(false)
    
    // Handle specific error types
    if (Platform.OS === 'web' && error.name === 'OverconstrainedError') {
      // Try with fallback constraints
      console.log('Trying fallback camera constraints')
      setCameraConstraints({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })
      setCameraKey(prev => prev + 1) // Force remount with new constraints
    } else if (hasPermission === true && error.name !== 'NotAllowedError') {
      // Only remount for non-permission errors
      console.log('Attempting camera recovery')
      setTimeout(() => {
        setCameraKey(prev => prev + 1) // Force remount after delay
      }, 1000)
    }
  }

  const handleBarCodeScanned = ({ type, data }) => {
    // Only process scans if camera is active, ready, and has permissions
    if (!isCameraActive || !isCameraReady || !hasPermission) {
      console.log('Camera not active for scanning:', { 
        active: isCameraActive, 
        ready: isCameraReady, 
        permission: hasPermission 
      })
      return
    }

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
      hasUploadedData,
      appState,
      tabFocused: isTabFocused
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
      matchedRecord: matchedRecord || 'none'
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
        {isEditingProfile ? (
          <View style={styles.profileEditContainer}>
            <TextInput
              style={styles.profileInlineInput}
              value={profileNameInput}
              onChangeText={(text) => {
                // Simple validation: 2-20 chars, alphanumeric + spaces only
                const sanitized = text.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 20)
                setProfileNameInput(sanitized)
              }}
              placeholder="Your name"
              placeholderTextColor="#9ca3af"
              autoFocus
              onSubmitEditing={() => {
                if (profileNameInput.trim().length >= 2) {
                  updateProfile({ userName: profileNameInput.trim() })
                  setIsEditingProfile(false)
                }
              }}
              onBlur={() => {
                if (profileNameInput.trim().length >= 2) {
                  updateProfile({ userName: profileNameInput.trim() })
                }
                setIsEditingProfile(false)
              }}
            />
            <TouchableOpacity 
              style={styles.profileSaveButton}
              onPress={() => {
                if (profileNameInput.trim().length >= 2) {
                  updateProfile({ userName: profileNameInput.trim() })
                  setIsEditingProfile(false)
                } else {
                  Alert.alert('Invalid Name', 'Name must be at least 2 characters long')
                }
              }}
            >
              <Text style={styles.profileSaveText}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.profileIcon} 
            onPress={() => {
              setProfileNameInput(profile.userName || '')
              setIsEditingProfile(true)
            }}
          >
            <View style={styles.profileIconCircle}>
              <Text style={styles.profileIconText}>{getProfileLetter()}</Text>
            </View>
          </TouchableOpacity>
        )}
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
              <Text style={styles.placeholderText}>Checking Camera Access</Text>
              <Text style={styles.placeholderSubtext}>Verifying permissions...</Text>
            </View>
          )}
          
          {hasPermission === false && (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.placeholderText}>Camera Access Required</Text>
              <Text style={styles.placeholderSubtext}>
                {getPlatformSpecificGuidance()}
              </Text>
              {browserInfo.detected && Platform.OS === 'web' && (
                <Text style={styles.browserInfo}>
                  Detected: {browserInfo.name} {browserInfo.version}
                </Text>
              )}
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={retryPermissions}
              >
                <Text style={styles.retryButtonText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {hasPermission && (
            <CameraView
              key={`camera-${cameraKey}`} // Controlled remounting only when needed
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              // Apply platform-optimized settings
              {...(cameraConstraints && Platform.OS === 'web' ? { 
                cameraType: 'back',
                ...cameraConstraints 
              } : {})}
              {...(cameraConstraints && Platform.OS !== 'web' ? cameraConstraints : {})}
              onBarcodeScanned={isCameraActive ? handleBarCodeScanned : undefined}
              onCameraReady={handleCameraReady}
              onMountError={handleCameraMountError}
            />
          )}
          
          {hasPermission && !isCameraReady && (
            <View style={styles.cameraInitializing}>
              <Text style={styles.placeholderText}>Starting Camera</Text>
              <Text style={styles.placeholderSubtext}>Initializing stream...</Text>
            </View>
          )}
          
          {hasPermission && isCameraReady && !isCameraActive && (
            <View style={styles.cameraPaused}>
              <Text style={styles.placeholderText}>Camera Paused</Text>
              <Text style={styles.placeholderSubtext}>Switch to scan tab to resume</Text>
            </View>
          )}
          
          {/* QR Code Outline - show when camera is ready and active */}
          {hasPermission && isCameraReady && isCameraActive && (
            <View style={styles.qrOutline}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          )}
        </View>
      </View>

      
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
  cameraInitializing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
    zIndex: 1,
  },
  cameraPaused: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    zIndex: 1,
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
  browserInfo: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
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
  profileEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#2563eb',
    minWidth: 120,
  },
  profileInlineInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  profileSaveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  profileSaveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
})