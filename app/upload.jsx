import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Dimensions, Alert } from 'react-native'
import React, { useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import Papa from 'papaparse'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ProfileModal from '../components/ProfileModal'

const { width, height } = Dimensions.get('window')

// Storage key (same as scan page)
const STORAGE_KEY = 'whuauth_uploaded_data'

// Responsive dimensions that work across platforms (shared with Scan page)
const getResponsiveDimensions = () => {
  const isWeb = Platform.OS === 'web'
  const isTablet = width > 768
  
  return {
    // Horizontal padding based on screen size
    horizontalPadding: isWeb ? (isTablet ? 40 : 20) : 20,
    
    // Top padding consistent across pages, responsive to platform
    topPadding: isWeb ? (isTablet ? 60 : 40) : 50,
    
    // Content width that's responsive
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

const Upload = () => {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [uploadedData, setUploadedData] = useState([])
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getProfileLetter = () => {
    return 'U' // Default profile letter
  }

  // Helper function for platform-compatible alerts
  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`)
    } else {
      Alert.alert(title, message)
    }
  }

  // Helper function for platform-compatible confirmation
  const showConfirm = (title, message, onConfirm) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`)
      if (confirmed) onConfirm()
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onConfirm }
      ])
    }
  }

  const parseCSV = (content) => {
    return new Promise((resolve) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data)
        }
      })
    })
  }

  const validateQRContent = (data) => {
    if (!data || data.length === 0) {
      return { valid: false, error: 'File is empty' }
    }
    
    const firstRow = data[0]
    const columns = Object.keys(firstRow)
    
    // Check if any column contains "QR Content" (case insensitive)
    const hasQRContent = columns.some(col => 
      col.toLowerCase().includes('qr content')
    )

    if (!hasQRContent) {
      return { 
        valid: false, 
        error: 'File must contain a column with "QR Content" in its name' 
      }
    }

    return { valid: true }
  }

  const handleFileSelect = async () => {
    try {
      setIsLoading(true)
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv'],
        copyToCacheDirectory: true,
        multiple: false,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0]
        
        // Validate file type
        if (!file.mimeType?.includes('csv') && !file.name?.toLowerCase().endsWith('.csv')) {
          showAlert('Error', 'Please upload a CSV file only.')
          return
        }

        const response = await fetch(file.uri)
        const content = await response.text()
        const parsedData = await parseCSV(content)

        // Validate QR Content column
        const validation = validateQRContent(parsedData)
        if (!validation.valid) {
          showAlert('Invalid File Format', validation.error)
          return
        }

        // Store data as-is in state and AsyncStorage
        setUploadedData(parsedData)
        setUploadedFileName(file.name)
        
        // Save to AsyncStorage for cross-page access
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData))
        console.log('Data saved to AsyncStorage:', parsedData.length, 'records')
        
        showAlert('Success', `File uploaded successfully! Found ${parsedData.length} records.`)
      }
    } catch (error) {
      console.error('File selection error:', error)
      showAlert('Error', 'Failed to load file. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFile = () => {
    showConfirm(
      'Remove File',
      'Are you sure you want to remove the uploaded file?',
      async () => {
        // Clear state
        setUploadedData([])
        setUploadedFileName('')
        
        // Clear AsyncStorage
        await AsyncStorage.removeItem(STORAGE_KEY)
        console.log('Data cleared from AsyncStorage')
      }
    )
  }

  const renderTableHeaders = () => {
    if (uploadedData.length === 0) return null
    
    const columns = Object.keys(uploadedData[0])
    return (
      <View style={styles.tableHeader}>
        {columns.map((column, index) => (
          <Text key={index} style={[styles.headerCell, { flex: 1, minWidth: 100 }]}>
            {column}
          </Text>
        ))}
      </View>
    )
  }

  const renderTableRows = () => {
    if (uploadedData.length === 0) return null
    
    const columns = Object.keys(uploadedData[0])
    
    return uploadedData.map((row, rowIndex) => (
      <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 && styles.evenRow]}>
        {columns.map((column, colIndex) => (
          <Text 
            key={colIndex} 
            style={[styles.cell, { flex: 1, minWidth: 100 }]} 
            numberOfLines={2}
          >
            {row[column] || ''}
          </Text>
        ))}
      </View>
    ))
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Document Upload</Text>
            <Text style={styles.subtitle}>Upload CSV files with QR Content column</Text>
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

        {/* File Upload Interface */}
        <View style={styles.uploadSection}>
          <View style={styles.uploadContainer}>
            <View style={styles.uploadIcon}>
              <Text style={styles.uploadIconText}>+</Text>
            </View>
            <Text style={styles.uploadText}>Select your data file</Text>
            
            <TouchableOpacity 
              style={[styles.browseButton, isLoading && styles.browseButtonDisabled]} 
              onPress={handleFileSelect}
              disabled={isLoading}
            >
              <Text style={styles.browseButtonText}>
                {isLoading ? 'Loading...' : 'Select Files'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.supportedFormats}>CSV files with QR Content column</Text>
          </View>

          {/* Upload Status / Remove Button */}
          {uploadedData.length > 0 ? (
            <TouchableOpacity style={styles.removeButton} onPress={handleRemoveFile}>
              <Text style={styles.removeButtonText}>Remove File</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>No files uploaded yet</Text>
            </View>
          )}
        </View>

        {/* File Contents Display */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>File Contents</Text>
            {uploadedFileName && (
              <Text style={styles.fileName}>Viewing: {uploadedFileName}</Text>
            )}
          </View>

          <View style={styles.listContainer}>
            {uploadedData.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.table}>
                  {renderTableHeaders()}
                  {renderTableRows()}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>○</Text>
                </View>
                <Text style={styles.emptyText}>No file content</Text>
                <Text style={styles.emptySubtext}>Upload a CSV file to view its contents</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </View>
  )
}

export default Upload

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
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
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingVertical: 24,
    paddingHorizontal: getResponsiveDimensions().horizontalPadding,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  uploadIcon: {
    marginBottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconText: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '300',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: '#2563eb',
    paddingVertical: Math.max(10, getResponsiveDimensions().minTouchTarget / 4),
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    minHeight: getResponsiveDimensions().minTouchTarget,
    justifyContent: 'center',
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  supportedFormats: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    minHeight: getResponsiveDimensions().minTouchTarget,
    justifyContent: 'center',
    width: '100%',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  contentSection: {
    marginBottom: 20,
  },
  contentHeader: {
    marginBottom: 15,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  fileName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
    width: '100%',
    minHeight: 200,
    flex: 0,
  },
  table: {
    minWidth: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e1e5e9',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'left',
    paddingRight: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  evenRow: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    fontSize: 13,
    color: '#333',
    textAlign: 'left',
    paddingRight: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 20,
    color: '#9ca3af',
    fontWeight: '300',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
})
