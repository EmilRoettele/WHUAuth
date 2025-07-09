import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CameraView } from 'expo-camera'
import WebQRScanner from './WebQRScanner'
import { isWeb } from '../utils/platform'
import { getResponsiveDimensions } from '../utils/dimensions'

const UniversalQRScanner = ({ 
  onBarcodeScanned, 
  cameraStatus, 
  retryPermissions, 
  style 
}) => {
  // Use web scanner for browsers, native camera for mobile
  if (isWeb) {
    return (
      <WebQRScanner
        onBarcodeScanned={onBarcodeScanned}
        style={style}
      />
    )
  }

  // Native implementation for mobile platforms (React Native components)
  return (
    <>
      {cameraStatus === 'loading' && (
        <View style={[style, styles.placeholder]}>
          <Text style={styles.placeholderText}>Initializing Camera</Text>
        </View>
      )}
      
      {cameraStatus === 'denied' && (
        <View style={[style, styles.placeholder]}>
          <Text style={styles.placeholderText}>Camera Permission Denied</Text>
          <Text style={styles.placeholderSubtext}>
            Enable camera access in settings
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryPermissions}>
            <Text style={styles.retryButtonText}>Retry Permission</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {cameraStatus === 'ready' && (
        <CameraView
          style={style}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  placeholder: {
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
})

export default UniversalQRScanner 