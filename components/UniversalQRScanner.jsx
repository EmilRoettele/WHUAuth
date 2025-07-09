import React from 'react'
import { CameraView } from 'expo-camera'
import WebQRScanner from './WebQRScanner'
import { isWeb } from '../utils/platform'

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

  // Native implementation for mobile platforms
  return (
    <>
      {cameraStatus === 'loading' && (
        <div style={style}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            color: '#9ca3af',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Initializing Camera
          </div>
        </div>
      )}
      
      {cameraStatus === 'denied' && (
        <div style={style}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{ 
              color: '#9ca3af',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Camera Permission Denied
            </div>
            <div style={{ 
              color: '#9ca3af',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              Enable camera access in settings
            </div>
            <button
              onClick={retryPermissions}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Retry Permission
            </button>
          </div>
        </div>
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

export default UniversalQRScanner 