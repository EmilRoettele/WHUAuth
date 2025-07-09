import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PanResponder, Platform, Dimensions, TextInput } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import Papa from 'papaparse'
import { useData } from '../contexts/DataContext'
import { router } from 'expo-router'
import csvProcessor from '../utils/BackgroundCSVProcessor'

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
  const { 
    uploadedData, 
    uploadedFileName, 
    updateUploadedData, 
    clearUploadedData, 
    hasUploadedData, 
    profile,
    updateProfile,
    storageStatus
  } = useData()
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [csvProgress, setCSVProgress] = useState({ processing: false, percentage: 0, stage: '' })
  const [processingStats, setProcessingStats] = useState({ totalRows: 0, validRows: 0, errors: 0 })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileNameInput, setProfileNameInput] = useState(profile.userName || '')

  // CSV progress tracking
  useEffect(() => {
    const handleCSVProgress = (progress) => {
      console.log('CSV Progress:', progress)
      
      switch (progress.status) {
        case 'started':
          setCSVProgress({ 
            processing: true, 
            percentage: 0, 
            stage: 'Starting...',
            fileName: progress.fileName 
          })
          break
          
        case 'progress':
          setCSVProgress(prev => ({ 
            ...prev, 
            percentage: progress.percentage || 0,
            stage: progress.chunksTotal 
              ? `Processing chunk ${progress.chunksProcessed || 0}/${progress.chunksTotal}`
              : `Processing... ${progress.percentage || 0}%`
          }))
          break
          
        case 'completed':
          setCSVProgress({ 
            processing: false, 
            percentage: 100, 
            stage: 'Completed' 
          })
          setProcessingStats({
            totalRows: progress.rowCount || 0,
            validRows: progress.rowCount || 0,
            errors: progress.errorCount || 0
          })
          break
          
        case 'error':
          setCSVProgress({ 
            processing: false, 
            percentage: 0, 
            stage: 'Error occurred' 
          })
          break
          
        case 'stopped':
          setCSVProgress({ 
            processing: false, 
            percentage: 0, 
            stage: 'Stopped' 
          })
          break
      }
    }

    csvProcessor.addProgressListener('uploadComponent', handleCSVProgress)
    
    return () => {
      csvProcessor.removeProgressListener('uploadComponent')
    }
  }, [])

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

  // Legacy CSV parsing functions - now handled by background processor
  // Keeping for fallback compatibility if needed

  const handleFileSelect = async () => {
    try {
      // Check if CSV processor is busy
      if (csvProcessor.isProcessing()) {
        showAlert('Processing', 'A file is currently being processed. Please wait.')
        return
      }

      setIsLoading(true)
      setCSVProgress({ processing: false, percentage: 0, stage: 'Selecting file...' })
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv'],
        copyToCacheDirectory: true,
        multiple: false,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0]
        
        // Validate file type
        if (!file.mimeType?.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
          showAlert('Error', 'Please upload a CSV file only.')
          return
        }

        // Validate file size (prevent huge files from blocking)
        const maxSize = 10 * 1024 * 1024 // 10MB limit
        if (file.size && file.size > maxSize) {
          showAlert('File Too Large', 'Please upload files smaller than 10MB for optimal performance.')
          return
        }

        setCSVProgress({ processing: false, percentage: 0, stage: 'Reading file...' })
        
        // Read file content
        const response = await fetch(file.uri)
        const content = await response.text()
        
        if (!content || content.trim().length === 0) {
          showAlert('Error', 'File appears to be empty.')
          return
        }

        // Process CSV in background
        setCSVProgress({ processing: true, percentage: 0, stage: 'Processing CSV...' })
        console.log('Starting background CSV processing...')
        
        try {
          const result = await csvProcessor.processCSV(content, file.name)
          
          // Validate the processed data
          const validation = csvProcessor.validateCSVData(result.data)
          
          if (!validation.valid) {
            showAlert('Invalid File Format', validation.errors.join('\n'))
            return
          }

          // Show warnings if any
          if (validation.warnings.length > 0) {
            console.warn('CSV validation warnings:', validation.warnings)
          }

          // Normalize the data
          const normalizedData = csvProcessor.normalizeData(result.data)
          
          if (normalizedData.length === 0) {
            showAlert('Error', 'No valid data found in file. Please check that all rows have Random, Name, and QR Content.')
            return
          }

          // Update state and save data (non-blocking)
          setUploadedFiles([file])
          await updateUploadedData(normalizedData, file.name)
          
          // Show success with detailed stats
          const stats = validation.stats
          const successMessage = `File processed successfully!\n\n` +
            `• Valid records: ${normalizedData.length}\n` +
            `• Total rows processed: ${stats.totalRows}\n` +
            (stats.emptyRows > 0 ? `• Empty rows skipped: ${stats.emptyRows}\n` : '') +
            (stats.duplicateQRs > 0 ? `• Duplicate QRs found: ${stats.duplicateQRs}\n` : '') +
            (validation.warnings.length > 0 ? `• Warnings: ${validation.warnings.length}` : '')
            
          showAlert('Success', successMessage)
          
        } catch (processingError) {
          console.error('CSV processing error:', processingError)
          showAlert('Processing Error', 'Failed to process CSV file. Please check the file format and try again.')
        }
      }
    } catch (error) {
      console.error('File selection error:', error)
      showAlert('Error', 'Failed to load file. Please try again.')
    } finally {
      setIsLoading(false)
      // Don't reset CSV progress here - let it show completion status
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
                    showAlert('Invalid Name', 'Name must be at least 2 characters long')
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

        {/* File Upload Interface */}
        <View style={styles.uploadSection}>
        <View style={styles.uploadContainer}>
          <View style={styles.uploadIcon}>
            <Text style={styles.uploadIconText}>+</Text>
          </View>
          <Text style={styles.uploadText}>Select your data file</Text>
          
          {/* Progress Indicators */}
          {(csvProgress.processing || csvProgress.stage) && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressStage}>{csvProgress.stage}</Text>
              {csvProgress.processing && (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${csvProgress.percentage}%` }]} />
                </View>
              )}
              {csvProgress.percentage > 0 && (
                <Text style={styles.progressPercentage}>{csvProgress.percentage}%</Text>
              )}
            </View>
          )}
          
          {/* Storage Status */}
          {storageStatus.processing && (
            <View style={styles.storageStatusContainer}>
              <Text style={styles.storageStatusText}>Saving to storage... ({storageStatus.queueLength} operations)</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[
              styles.browseButton, 
              (isLoading || csvProgress.processing) && styles.browseButtonDisabled
            ]} 
            onPress={handleFileSelect}
            disabled={isLoading || csvProgress.processing}
          >
            <Text style={styles.browseButtonText}>
              {csvProgress.processing ? 'Processing...' : 
               isLoading ? 'Loading...' : 
               'Select Files'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.supportedFormats}>CSV files only (max 10MB)</Text>
          
          {/* Processing Stats */}
          {processingStats.totalRows > 0 && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Last Processing Results:</Text>
              <Text style={styles.statsText}>
                {processingStats.validRows} valid records from {processingStats.totalRows} total rows
                {processingStats.errors > 0 && ` (${processingStats.errors} errors)`}
              </Text>
            </View>
          )}
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
  progressContainer: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  progressStage: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e1e5e9',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
  storageStatusContainer: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  storageStatusText: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '500',
    textAlign: 'center',
  },
  statsContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  statsTitle: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
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
