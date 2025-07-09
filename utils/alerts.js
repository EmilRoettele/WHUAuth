import { Alert, Platform } from 'react-native'

// Unified alert system - handles platform differences internally
export const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`)
  } else {
    Alert.alert(title, message)
  }
}

// Unified confirmation dialog
export const showConfirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`)
    if (confirmed) onConfirm()
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: onConfirm }
    ])
  }
} 