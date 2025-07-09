import { Platform } from 'react-native'

// Platform detection utilities
export const isWeb = Platform.OS === 'web'
export const isNative = Platform.OS !== 'web'

// Detect specific browsers for enhanced web support
export const getBrowserInfo = () => {
  if (!isWeb) return null
  
  const userAgent = navigator.userAgent.toLowerCase()
  
  return {
    isChrome: userAgent.includes('chrome') && !userAgent.includes('edge'),
    isSafari: userAgent.includes('safari') && !userAgent.includes('chrome'),
    isFirefox: userAgent.includes('firefox'),
    isEdge: userAgent.includes('edge'),
    isMobile: /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  }
}

// Check if modern browser APIs are available
export const getBrowserCapabilities = () => {
  if (!isWeb) return null
  
  return {
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasBarcodeDetector: 'BarcodeDetector' in window,
    hasWebWorkers: typeof Worker !== 'undefined',
    hasCanvas: !!document.createElement('canvas').getContext
  }
}

// Web-specific camera constraints optimization
export const getOptimalWebCameraConstraints = () => {
  const browserInfo = getBrowserInfo()
  
  const baseConstraints = {
    video: {
      facingMode: 'environment', // Back camera
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 15, max: 30 }
    }
  }
  
  // Optimize for specific browsers
  if (browserInfo?.isMobile) {
    // Reduce resolution for mobile browsers
    baseConstraints.video.width = { ideal: 640, max: 1280 }
    baseConstraints.video.height = { ideal: 480, max: 720 }
    baseConstraints.video.frameRate = { ideal: 10, max: 15 }
  }
  
  return baseConstraints
} 