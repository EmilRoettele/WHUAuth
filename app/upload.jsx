import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native'
import React, { useState } from 'react'
import ProfileModal from '../components/ProfileModal'

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
  const [showProfileModal, setShowProfileModal] = useState(false)

  const getProfileLetter = () => {
    return 'U' // Default profile letter
  }

  // Mock data for display
  const mockData = [
    { id: 1, random: 'ABC123', name: 'John Doe', qrContent: 'sample-qr-1' },
    { id: 2, random: 'DEF456', name: 'Jane Smith', qrContent: 'sample-qr-2' },
    { id: 3, random: 'GHI789', name: 'Bob Johnson', qrContent: 'sample-qr-3' },
  ]

  const handleFileSelect = () => {
    // Mock function - no actual functionality
    console.log('File select clicked')
  }

  const handleClearUploads = () => {
    // Mock function - no actual functionality
    console.log('Clear uploads clicked')
  }

  return (
    <View style={styles.container}>
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
              style={styles.browseButton} 
              onPress={handleFileSelect}
            >
              <Text style={styles.browseButtonText}>Select Files</Text>
            </TouchableOpacity>
            
            <Text style={styles.supportedFormats}>CSV files only</Text>
          </View>

          {/* Upload Status / Clear Button */}
          <TouchableOpacity style={styles.clearButton} onPress={handleClearUploads}>
            <Text style={styles.clearButtonText}>Clear Uploads</Text>
          </TouchableOpacity>
        </View>

        {/* File Contents Display */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>File Contents</Text>
            <Text style={styles.fileName}>Viewing: sample-data.csv</Text>
          </View>

          <View style={styles.listContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.randomColumn]}>Random</Text>
              <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
              <Text style={[styles.headerCell, styles.qrColumn]}>QR Content</Text>
            </View>

            {/* Table Rows */}
            {mockData.map((item, index) => (
              <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
                <Text style={[styles.cell, styles.randomColumn]} numberOfLines={1}>{item.random}</Text>
                <Text style={[styles.cell, styles.nameColumn]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.cell, styles.qrColumn]} numberOfLines={1}>{item.qrContent}</Text>
              </View>
            ))}
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
  supportedFormats: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    minHeight: getResponsiveDimensions().minTouchTarget,
    justifyContent: 'center',
    width: '100%',
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
    width: '100%',
    minHeight: 200,
    flex: 0,
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
  // Column widths for proper table layout
  randomColumn: {
    flex: 1,
    minWidth: 80,
  },
  nameColumn: {
    flex: 2,
    minWidth: 120,
  },
  qrColumn: {
    flex: 2,
    minWidth: 120,
  },
})
