import { StyleSheet, Text, View, TouchableOpacity, Modal, Animated, Dimensions, PanResponder, TextInput, Platform } from 'react-native'
import React, { useState, useRef } from 'react'
import { useData } from '../contexts/DataContext'

const { width } = Dimensions.get('window')

const ProfileModal = ({ visible, onClose }) => {
  const { profile, updateProfile, uploadedFileName, hasUploadedData } = useData()
  const translateX = useRef(new Animated.Value(width)).current
  const [isAnimating, setIsAnimating] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')

  React.useEffect(() => {
    if (visible) {
      setIsAnimating(true)
      const animation = Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
      animation.start(() => setIsAnimating(false))
      return () => animation.stop()
    } else {
      setIsAnimating(true)
      const animation = Animated.timing(translateX, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      })
      animation.start(() => setIsAnimating(false))
      return () => animation.stop()
    }
  }, [visible, translateX])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 100
      },
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value)
        translateX.setValue(0)
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset()
        
        if (gestureState.dx > width * 0.3 || gestureState.vx > 1) {
          onClose()
        } else {
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  const startEditingName = () => {
    setTempName(profile.userName || '')
    setIsEditingName(true)
  }

  const saveName = () => {
    if (tempName.trim()) {
      updateProfile({ userName: tempName.trim() })
    }
    setIsEditingName(false)
    setTempName('')
  }

  const cancelEditingName = () => {
    setIsEditingName(false)
    setTempName('')
  }

  const getDeviceType = () => {
    if (Platform.OS === 'ios') return 'iPhone'
    if (Platform.OS === 'android') return 'Android'
    return 'Web Browser'
  }

  const getAvatarLetter = () => {
    const name = profile.userName || 'User'
    return name.charAt(0).toUpperCase()
  }

  if (!visible && !isAnimating) return null

  return (
    <Modal
      visible={visible || isAnimating}
      transparent={true}
      animationType="none"
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.profileContainer,
            { transform: [{ translateX }] }
          ]}
          {...panResponder.panHandlers}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Content */}
          <View style={styles.content}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getAvatarLetter()}</Text>
              </View>
              
              {isEditingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder="Enter your name"
                    autoFocus
                    onSubmitEditing={saveName}
                  />
                  <View style={styles.nameEditButtons}>
                    <TouchableOpacity style={styles.saveButton} onPress={saveName}>
                      <Text style={styles.saveButtonText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEditingName}>
                      <Text style={styles.cancelButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={startEditingName}>
                  <Text style={styles.userName}>
                    {profile.userName || 'Tap to set name'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <Text style={styles.deviceInfo}>Device: {getDeviceType()}</Text>
              <Text style={styles.dataInfo}>
                {hasUploadedData ? `File: ${uploadedFileName}` : 'No file uploaded'}
              </Text>
            </View>

            <View style={styles.storageInfo}>
              <Text style={styles.storageTitle}>📱 Local Storage</Text>
              <Text style={styles.storageText}>
                Data is stored on this device only and will persist between app sessions.
              </Text>
            </View>

            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuItemText}>App Info</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

export default ProfileModal

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  profileContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  nameEditContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 150,
    textAlign: 'center',
    marginBottom: 8,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#10b981',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceInfo: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  dataInfo: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  storageInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  storageText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  menuSection: {
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
}) 