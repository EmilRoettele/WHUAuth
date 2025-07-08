import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PanResponder, Platform, Dimensions } from 'react-native'
import React, { useState, useRef } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import Papa from 'papaparse'
import ProfileModal from '../components/ProfileModal'
import { useData } from '../contexts/DataContext'
import { router } from 'expo-router'

const { width, height } = Dimensions.get('window')

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
  const { uploadedData, uploadedFileName, updateUploadedData, clearUploadedData, hasUploadedData, profile } = useData()
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
        // Swipe left to go to Scan page
        if (gestureState.dx < -100 && Math.abs(gestureState.vx) > 0.5) {
          router.push('/')
        }
      },
    })
  ).current

  const getProfileLetter = () => {
    const name = profile.userName || 'User'
    return name.charAt(0).toUpperCase()
  }

  // Helper function for platform-compatible alerts
  const showAlert = (title, message, type = 'info') => {
    if (Platform.OS === 'web') {
      // Use native browser alert for web
      window.alert(`${title}\n\n${message}`)
    } else {
      // Use React Native Alert for mobile
      Alert.alert(title, message)
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

  const validateColumns = (data) => {
    if (!data || data.length === 0) return { valid: false, error: 'File is empty' }
    
    const firstRow = data[0]
    const hasRandom = firstRow.hasOwnProperty('Random') || firstRow.hasOwnProperty('random')
    const hasName = firstRow.hasOwnProperty('Name') || firstRow.hasOwnProperty('name')
    const hasQR = firstRow.hasOwnProperty('QR Content') || firstRow.hasOwnProperty('QR') || firstRow.hasOwnProperty('qr_content')

    if (!hasRandom || !hasName || !hasQR) {
      return { 
        valid: false, 
        error: 'File must contain columns: Random, Name, QR Content' 
      }
    }

    return { valid: true }
  }

  const normalizeData = (data) => {
    return data.map((row, index) => {
      const random = row.Random || row.random || ''
      const name = row.Name || row.name || ''
      const qrContent = row['QR Content'] || row.QR || row.qr_content || ''
      
      return {
        id: index + 1,
        random: random.toString().trim(),
        name: name.toString().trim(),
        qrContent: qrContent.toString().trim()
      }
    }).filter(row => row.random && row.name && row.qrContent) // Filter out incomplete rows
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
        const response = await fetch(file.uri)
        
        if (!file.mimeType === 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
          showAlert('Error', 'Please upload a CSV file only.')
          return
        }

        const content = await response.text()
        const parsedData = await parseCSV(content)

        const validation = validateColumns(parsedData)
        if (!validation.valid) {
          showAlert('Invalid File Format', validation.error)
          return
        }

        const normalizedData = normalizeData(parsedData)
        
        if (normalizedData.length === 0) {
          showAlert('Error', 'No valid data found in file. Please check that all rows have Random, Name, and QR Content.')
          return
        }

        setUploadedFiles([file])
        updateUploadedData(normalizedData, file.name)
        
        showAlert('Success', `File uploaded successfully! Found ${normalizedData.length} valid records.`)
      }
    } catch (error) {
      console.error('File selection error:', error)
      showAlert('Error', 'Failed to load file. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearUploads = () => {
    const clearData = () => {
      setUploadedFiles([])
      clearUploadedData()
    }

    if (Platform.OS === 'web') {
      // Use native browser confirm dialog for web
      const confirmed = window.confirm(
        'Are you sure you want to clear all uploaded files and their content? This action cannot be undone.'
      )
      if (confirmed) {
        clearData()
      }
    } else {
      // Use React Native Alert for mobile
      Alert.alert(
        'Clear All Uploads',
        'Are you sure you want to clear all uploaded files and their content? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: clearData,
          },
        ]
      )
    }
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Document Upload</Text>
            <Text style={styles.subtitle}>Upload CSV files only</Text>
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
          
          <Text style={styles.supportedFormats}>CSV files only</Text>
        </View>

        {/* Upload Status / Clear Button */}
        {hasUploadedData ? (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearUploads}>
            <Text style={styles.clearButtonText}>Clear Uploads</Text>
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
              <>
                              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.randomColumn]}>Random</Text>
                <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
                <Text style={[styles.headerCell, styles.qrColumn]}>QR Content</Text>
              </View>

              {/* Table Rows */}
              {uploadedData.map((item, index) => (
                <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
                  <Text style={[styles.cell, styles.randomColumn]} numberOfLines={1}>{item.random}</Text>
                  <Text style={[styles.cell, styles.nameColumn]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.cell, styles.qrColumn]} numberOfLines={1}>{item.qrContent}</Text>
                </View>
              ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>○</Text>
                </View>
                <Text style={styles.emptyText}>No file content</Text>
                <Text style={styles.emptySubtext}>Upload a CSV file with Random, Name, and QR Content columns</Text>
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
    textAlign: 'left', // Consistent left alignment for both pages
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
    // Responsive max width to prevent overly wide containers on large screens
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
    alignSelf: 'center',
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
    borderColor: '#9ca3af',
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
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    minHeight: getResponsiveDimensions().minTouchTarget,
    justifyContent: 'center',
  },
  clearButtonText: {
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
    // Responsive max width for better readability on large screens
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'left',
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
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
  },
  randomColumn: {
    flex: 1.2,
    paddingRight: 10,
  },
  nameColumn: {
    flex: 1,
    paddingRight: 10,
  },
  qrColumn: {
    flex: 1.5,
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
    paddingHorizontal: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
})
