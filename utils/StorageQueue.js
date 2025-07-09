import AsyncStorage from '@react-native-async-storage/async-storage'
import { InteractionManager, Platform } from 'react-native'

class StorageQueue {
  constructor() {
    this.queue = []
    this.processing = false
    this.listeners = new Map() // For progress tracking
  }

  // Queue storage operation for background processing
  async queueOperation(operation) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        id: Date.now() + Math.random(),
        operation,
        resolve,
        reject,
        timestamp: Date.now()
      }
      
      this.queue.push(queueItem)
      this.notifyListeners('queued', queueItem.id)
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  // Process queue in background without blocking UI
  async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    // Use platform-appropriate background execution
    const executeInBackground = Platform.OS === 'web' 
      ? this.executeWebBackground.bind(this)
      : this.executeNativeBackground.bind(this)
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()
      
      try {
        this.notifyListeners('processing', item.id)
        
        const result = await executeInBackground(async () => {
          return await item.operation()
        })
        
        this.notifyListeners('completed', item.id)
        item.resolve(result)
        
      } catch (error) {
        console.error('Storage queue operation failed:', error)
        this.notifyListeners('error', item.id, error)
        item.reject(error)
      }
      
      // Small delay between operations to prevent blocking
      await this.delayExecution(10)
    }
    
    this.processing = false
  }

  // Web-specific background execution using requestIdleCallback
  async executeWebBackground(operation) {
    return new Promise((resolve, reject) => {
      const execute = () => {
        try {
          const result = operation()
          if (result instanceof Promise) {
            result.then(resolve).catch(reject)
          } else {
            resolve(result)
          }
        } catch (error) {
          reject(error)
        }
      }

      if (window.requestIdleCallback) {
        window.requestIdleCallback(execute, { timeout: 5000 })
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(execute, 0)
      }
    })
  }

  // Native-specific background execution using InteractionManager
  async executeNativeBackground(operation) {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          const result = await operation()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  // Smart delay that yields to UI thread
  async delayExecution(ms) {
    return new Promise(resolve => {
      if (Platform.OS === 'web' && window.requestIdleCallback) {
        window.requestIdleCallback(() => resolve(), { timeout: ms })
      } else {
        setTimeout(resolve, ms)
      }
    })
  }

  // Progress tracking for UI updates
  addProgressListener(listenerId, callback) {
    this.listeners.set(listenerId, callback)
  }

  removeProgressListener(listenerId) {
    this.listeners.delete(listenerId)
  }

  notifyListeners(status, operationId, error = null) {
    this.listeners.forEach(callback => {
      try {
        callback({ status, operationId, error, queueLength: this.queue.length })
      } catch (err) {
        console.error('Progress listener error:', err)
      }
    })
  }

  // Storage operation wrappers with automatic queuing
  async setItem(key, value) {
    return this.queueOperation(async () => {
      // Chunked storage for large data
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      
      if (stringValue.length > 100000) { // 100KB threshold
        return this.setLargeItem(key, stringValue)
      } else {
        return AsyncStorage.setItem(key, stringValue)
      }
    })
  }

  async getItem(key) {
    return this.queueOperation(async () => {
      const value = await AsyncStorage.getItem(key)
      
      // Handle chunked data retrieval
      if (value && value.startsWith('__CHUNKED__')) {
        return this.getLargeItem(key)
      }
      
      return value
    })
  }

  async removeItem(key) {
    return this.queueOperation(async () => {
      // Clean up both regular and chunked data
      await AsyncStorage.removeItem(key)
      
      // Remove any chunks
      const keys = await AsyncStorage.getAllKeys()
      const chunkKeys = keys.filter(k => k.startsWith(`${key}__chunk__`))
      if (chunkKeys.length > 0) {
        await AsyncStorage.multiRemove(chunkKeys)
      }
    })
  }

  // Handle large data by chunking (prevents storage limits)
  async setLargeItem(key, value) {
    const chunkSize = 50000 // 50KB chunks
    const chunks = []
    
    for (let i = 0; i < value.length; i += chunkSize) {
      chunks.push(value.slice(i, i + chunkSize))
    }
    
    // Store chunks
    const operations = chunks.map((chunk, index) => 
      AsyncStorage.setItem(`${key}__chunk__${index}`, chunk)
    )
    
    await Promise.all(operations)
    
    // Store metadata
    await AsyncStorage.setItem(key, `__CHUNKED__${chunks.length}`)
  }

  async getLargeItem(key) {
    const metadata = await AsyncStorage.getItem(key)
    const chunkCount = parseInt(metadata.replace('__CHUNKED__', ''))
    
    const chunkPromises = []
    for (let i = 0; i < chunkCount; i++) {
      chunkPromises.push(AsyncStorage.getItem(`${key}__chunk__${i}`))
    }
    
    const chunks = await Promise.all(chunkPromises)
    return chunks.join('')
  }

  // Get queue status for UI feedback
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    }
  }

  // Emergency clear (for error recovery)
  clearQueue() {
    console.warn('Clearing storage queue - rejecting all pending operations')
    
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'))
    })
    
    this.queue = []
    this.processing = false
    this.notifyListeners('cleared', null)
  }
}

// Singleton instance
const storageQueue = new StorageQueue()

export default storageQueue 