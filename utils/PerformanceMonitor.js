import { Platform } from 'react-native'

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cameraInitTime: null,
      permissionRequestTime: null,
      csvProcessingTime: null,
      storageOperationTime: null,
      tabSwitchTime: null,
      averageFrameRate: null
    }
    this.timers = new Map()
    this.listeners = new Map()
    this.frameCounter = 0
    this.lastFrameTime = 0
  }

  // Start timing an operation
  startTiming(operation) {
    this.timers.set(operation, Date.now())
    this.notifyListeners('timing_started', { operation })
  }

  // End timing and record metric
  endTiming(operation) {
    const startTime = this.timers.get(operation)
    if (startTime) {
      const duration = Date.now() - startTime
      this.metrics[operation] = duration
      this.timers.delete(operation)
      
      console.log(`Performance: ${operation} took ${duration}ms`)
      this.notifyListeners('timing_completed', { operation, duration })
      
      return duration
    }
    return null
  }

  // Record a custom metric
  recordMetric(name, value, unit = 'ms') {
    this.metrics[name] = value
    console.log(`Performance: ${name} = ${value}${unit}`)
    this.notifyListeners('metric_recorded', { name, value, unit })
  }

  // Monitor frame rate (web only)
  startFrameRateMonitoring() {
    if (Platform.OS !== 'web') return

    const measureFrameRate = (timestamp) => {
      if (this.lastFrameTime) {
        const delta = timestamp - this.lastFrameTime
        const fps = 1000 / delta
        
        this.frameCounter++
        if (this.frameCounter % 60 === 0) { // Report every 60 frames
          this.recordMetric('currentFPS', Math.round(fps), 'fps')
        }
      }
      
      this.lastFrameTime = timestamp
      requestAnimationFrame(measureFrameRate)
    }

    requestAnimationFrame(measureFrameRate)
  }

  // Memory usage monitoring
  getMemoryUsage() {
    if (Platform.OS === 'web' && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      }
    }
    return null
  }

  // Network timing (web only)
  getNetworkTiming() {
    if (Platform.OS === 'web' && performance.getEntriesByType) {
      const navigation = performance.getEntriesByType('navigation')[0]
      if (navigation) {
        return {
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
          loadComplete: Math.round(navigation.loadEventEnd),
          networkLatency: Math.round(navigation.responseStart - navigation.requestStart)
        }
      }
    }
    return null
  }

  // Get comprehensive performance report
  getPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      metrics: { ...this.metrics },
      memory: this.getMemoryUsage(),
      network: this.getNetworkTiming(),
      recommendations: this.generateRecommendations()
    }

    console.log('Performance Report:', report)
    return report
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = []

    // Camera performance
    if (this.metrics.cameraInitTime > 2000) {
      recommendations.push({
        category: 'Camera',
        issue: 'Slow camera initialization',
        suggestion: 'Consider pre-warming camera or reducing initial constraints',
        severity: 'medium'
      })
    }

    // CSV processing performance
    if (this.metrics.csvProcessingTime > 5000) {
      recommendations.push({
        category: 'CSV Processing',
        issue: 'Slow CSV processing',
        suggestion: 'Use smaller chunk sizes or implement progressive loading',
        severity: 'high'
      })
    }

    // Storage performance
    if (this.metrics.storageOperationTime > 1000) {
      recommendations.push({
        category: 'Storage',
        issue: 'Slow storage operations',
        suggestion: 'Consider compressing data or using smaller storage chunks',
        severity: 'medium'
      })
    }

    // Memory usage
    const memory = this.getMemoryUsage()
    if (memory && memory.used / memory.limit > 0.8) {
      recommendations.push({
        category: 'Memory',
        issue: 'High memory usage',
        suggestion: 'Implement memory cleanup and reduce cached data',
        severity: 'high'
      })
    }

    // Frame rate
    if (this.metrics.currentFPS && this.metrics.currentFPS < 30) {
      recommendations.push({
        category: 'Rendering',
        issue: 'Low frame rate',
        suggestion: 'Optimize UI components and reduce complex animations',
        severity: 'medium'
      })
    }

    return recommendations
  }

  // Performance optimization suggestions
  getOptimizationSuggestions() {
    return {
      camera: {
        'Reduce resolution': 'Lower camera resolution for better performance',
        'Limit frame rate': 'Cap frame rate to 30fps for battery savings',
        'Cache permissions': 'Cache permission status to avoid repeated checks'
      },
      storage: {
        'Batch operations': 'Group multiple storage operations together',
        'Compress data': 'Use compression for large datasets',
        'Background processing': 'Move heavy operations to background threads'
      },
      ui: {
        'Lazy loading': 'Load components only when needed',
        'Virtualization': 'Use virtual lists for large datasets',
        'Image optimization': 'Optimize and compress images'
      }
    }
  }

  // Add performance listener
  addListener(id, callback) {
    this.listeners.set(id, callback)
  }

  // Remove performance listener
  removeListener(id) {
    this.listeners.delete(id)
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback({ event, ...data })
      } catch (error) {
        console.error('Performance listener error:', error)
      }
    })
  }

  // Reset all metrics
  reset() {
    this.metrics = {
      cameraInitTime: null,
      permissionRequestTime: null,
      csvProcessingTime: null,
      storageOperationTime: null,
      tabSwitchTime: null,
      averageFrameRate: null
    }
    this.timers.clear()
    this.frameCounter = 0
    this.lastFrameTime = 0
    console.log('Performance metrics reset')
  }

  // Export metrics for analysis
  exportMetrics() {
    return JSON.stringify(this.getPerformanceReport(), null, 2)
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor()

// Auto-start frame rate monitoring on web
if (Platform.OS === 'web') {
  performanceMonitor.startFrameRateMonitoring()
}

export default performanceMonitor 