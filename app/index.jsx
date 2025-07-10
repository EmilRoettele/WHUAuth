import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform } from 'react-native'
import React, { useState } from 'react'
import ProfileModal from '../components/ProfileModal'

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
  const [showProfileModal, setShowProfileModal] = useState(false)

  const getProfileLetter = () => {
    return 'U' // Default profile letter
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

      {/* Message Space */}
      <View style={styles.messageSpace}>
        {/* Placeholder for messages */}
      </View>

      {/* Camera/Scanner Area */}
      <View style={styles.cameraContainer}>
        <View style={styles.mockCamera}>
          <Text style={styles.mockCameraText}>Camera Scanner UI</Text>
          <Text style={styles.mockCameraSubtext}>Mock camera interface</Text>
        </View>
        
        {/* Scanner Frame */}
        <View style={styles.scannerFrame}>
          <View style={[styles.scannerCorner, styles.topLeft]} />
          <View style={[styles.scannerCorner, styles.topRight]} />
          <View style={[styles.scannerCorner, styles.bottomLeft]} />
          <View style={[styles.scannerCorner, styles.bottomRight]} />
        </View>
      </View>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>Scan QR codes for quick access</Text>
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
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  mockCamera: {
    width: getResponsiveDimensions().contentWidth,
    height: getResponsiveDimensions().contentWidth,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  mockCameraText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 8,
  },
  mockCameraSubtext: {
    fontSize: 14,
    color: '#9ca3af',
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
  helpContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  helpText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
})