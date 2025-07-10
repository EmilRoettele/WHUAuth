import { StyleSheet, Text, View, TouchableOpacity, Modal, Animated } from 'react-native'
import React, { useRef } from 'react'

const ProfileModal = ({ visible, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start()
    }
  }, [visible, fadeAnim])

  const getAvatarLetter = () => {
    return 'U' // Default profile letter
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.popup,
            { opacity: fadeAnim }
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Profile Icon and Name */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getAvatarLetter()}</Text>
            </View>
            <Text style={styles.userName}>User</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    minWidth: 320,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
}) 