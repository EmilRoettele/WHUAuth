import { Dimensions, Platform } from 'react-native'

const { width } = Dimensions.get('window')

// Shared responsive dimensions that work across platforms
export const getResponsiveDimensions = () => {
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