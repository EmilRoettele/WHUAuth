import Papa from 'papaparse'
import { Platform } from 'react-native'

class BackgroundCSVProcessor {
  constructor() {
    this.listeners = new Map()
    this.processing = false
  }

  // Process CSV in background with progress tracking
  async processCSV(fileContent, fileName = 'file.csv') {
    return new Promise((resolve, reject) => {
      if (this.processing) {
        reject(new Error('CSV processor is busy. Please wait.'))
        return
      }

      this.processing = true
      const processingId = Date.now() + Math.random()

      this.notifyListeners('started', processingId, { 
        fileName, 
        size: fileContent.length 
      })

      // Platform-specific processing
      if (Platform.OS === 'web' && window.Worker && fileContent.length > 50000) {
        this.processWithWebWorker(fileContent, fileName, processingId, resolve, reject)
      } else {
        this.processWithChunking(fileContent, fileName, processingId, resolve, reject)
      }
    })
  }

  // Web Worker processing for large files
  processWithWebWorker(fileContent, fileName, processingId, resolve, reject) {
    try {
      // Create inline worker for CSV processing
      const workerCode = `
        importScripts('https://unpkg.com/papaparse@5.4.1/papaparse.min.js');
        
        self.onmessage = function(e) {
          const { content, fileName, processingId } = e.data;
          
          try {
            let progress = 0;
            const totalSize = content.length;
            
            Papa.parse(content, {
              header: true,
              skipEmptyLines: true,
              step: function(row, parser) {
                progress += JSON.stringify(row).length;
                const percentage = Math.round((progress / totalSize) * 100);
                
                // Send progress updates every 5%
                if (percentage % 5 === 0) {
                  self.postMessage({
                    type: 'progress',
                    processingId,
                    percentage,
                    rowsProcessed: parser.getCharIndex()
                  });
                }
              },
              complete: function(results) {
                self.postMessage({
                  type: 'complete',
                  processingId,
                  data: results.data,
                  errors: results.errors,
                  meta: results.meta
                });
              },
              error: function(error) {
                self.postMessage({
                  type: 'error',
                  processingId,
                  error: error.message
                });
              }
            });
          } catch (error) {
            self.postMessage({
              type: 'error',
              processingId,
              error: error.message
            });
          }
        };
      `

      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const worker = new Worker(URL.createObjectURL(blob))

      worker.onmessage = (e) => {
        const { type, processingId: msgId, percentage, data, errors, error } = e.data

        if (msgId !== processingId) return

        switch (type) {
          case 'progress':
            this.notifyListeners('progress', processingId, { percentage })
            break
          
          case 'complete':
            this.processing = false
            this.notifyListeners('completed', processingId, { 
              rowCount: data.length,
              errorCount: errors.length 
            })
            worker.terminate()
            URL.revokeObjectURL(blob)
            resolve({ data, errors, fileName })
            break
          
          case 'error':
            this.processing = false
            this.notifyListeners('error', processingId, { error })
            worker.terminate()
            URL.revokeObjectURL(blob)
            reject(new Error(error))
            break
        }
      }

      worker.onerror = (error) => {
        this.processing = false
        this.notifyListeners('error', processingId, { error: error.message })
        worker.terminate()
        URL.revokeObjectURL(blob)
        reject(error)
      }

      worker.postMessage({ content: fileContent, fileName, processingId })

    } catch (error) {
      this.processing = false
      this.notifyListeners('error', processingId, { error: error.message })
      reject(error)
    }
  }

  // Chunked processing for native or fallback
  async processWithChunking(fileContent, fileName, processingId, resolve, reject) {
    try {
      const chunkSize = 10000 // Process 10KB chunks
      const chunks = []
      let allRows = []
      let allErrors = []
      
      // Split content into chunks
      for (let i = 0; i < fileContent.length; i += chunkSize) {
        chunks.push(fileContent.slice(i, i + chunkSize))
      }

      this.notifyListeners('progress', processingId, { 
        percentage: 0, 
        chunksTotal: chunks.length 
      })

      // Process chunks with yielding to UI thread
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const isFirstChunk = i === 0
        const isLastChunk = i === chunks.length - 1

        // Parse chunk
        const result = await this.parseChunk(chunk, isFirstChunk, isLastChunk)
        
        if (result.data) {
          allRows = allRows.concat(result.data)
        }
        if (result.errors) {
          allErrors = allErrors.concat(result.errors)
        }

        // Update progress
        const percentage = Math.round(((i + 1) / chunks.length) * 100)
        this.notifyListeners('progress', processingId, { 
          percentage,
          chunksProcessed: i + 1,
          chunksTotal: chunks.length
        })

        // Yield to UI thread
        await this.yieldToUI()
      }

      this.processing = false
      this.notifyListeners('completed', processingId, { 
        rowCount: allRows.length,
        errorCount: allErrors.length 
      })

      resolve({ 
        data: allRows, 
        errors: allErrors, 
        fileName 
      })

    } catch (error) {
      this.processing = false
      this.notifyListeners('error', processingId, { error: error.message })
      reject(error)
    }
  }

  // Parse individual chunk
  async parseChunk(chunk, isFirst, isLast) {
    return new Promise((resolve) => {
      Papa.parse(chunk, {
        header: isFirst, // Only parse header on first chunk
        skipEmptyLines: true,
        complete: (result) => resolve(result),
        error: (error) => resolve({ data: [], errors: [error] })
      })
    })
  }

  // Yield execution to UI thread
  async yieldToUI() {
    return new Promise(resolve => {
      if (Platform.OS === 'web' && window.requestIdleCallback) {
        window.requestIdleCallback(resolve, { timeout: 16 })
      } else {
        setTimeout(resolve, 16) // ~60fps
      }
    })
  }

  // Validate CSV structure and data quality
  validateCSVData(data, requiredColumns = ['Random', 'Name', 'QR Content']) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        totalRows: data.length,
        validRows: 0,
        emptyRows: 0,
        duplicateQRs: 0
      }
    }

    if (!data || data.length === 0) {
      validation.valid = false
      validation.errors.push('File is empty or could not be parsed')
      return validation
    }

    // Check required columns
    const firstRow = data[0]
    const missingColumns = requiredColumns.filter(col => 
      !Object.keys(firstRow).some(key => 
        key.toLowerCase().includes(col.toLowerCase())
      )
    )

    if (missingColumns.length > 0) {
      validation.valid = false
      validation.errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
      return validation
    }

    // Validate data quality
    const qrContentSeen = new Set()
    
    data.forEach((row, index) => {
      const random = this.getColumnValue(row, 'Random')
      const name = this.getColumnValue(row, 'Name')
      const qrContent = this.getColumnValue(row, 'QR Content')

      // Check for empty rows
      if (!random && !name && !qrContent) {
        validation.stats.emptyRows++
        return
      }

      // Check for missing required fields
      if (!random || !name || !qrContent) {
        validation.warnings.push(`Row ${index + 1}: Missing required data`)
        return
      }

      // Check for duplicate QR codes
      if (qrContentSeen.has(qrContent)) {
        validation.stats.duplicateQRs++
        validation.warnings.push(`Row ${index + 1}: Duplicate QR content "${qrContent}"`)
      } else {
        qrContentSeen.add(qrContent)
      }

      validation.stats.validRows++
    })

    // Final validation
    if (validation.stats.validRows === 0) {
      validation.valid = false
      validation.errors.push('No valid data rows found')
    }

    return validation
  }

  // Helper to get column value with flexible matching
  getColumnValue(row, columnName) {
    const key = Object.keys(row).find(k => 
      k.toLowerCase().includes(columnName.toLowerCase())
    )
    return key ? row[key]?.toString().trim() : ''
  }

  // Normalize parsed data
  normalizeData(data) {
    return data.map((row, index) => {
      const random = this.getColumnValue(row, 'Random')
      const name = this.getColumnValue(row, 'Name')
      const qrContent = this.getColumnValue(row, 'QR Content')
      
      return {
        id: index + 1,
        random: random,
        name: name,
        qrContent: qrContent
      }
    }).filter(row => row.random && row.name && row.qrContent)
  }

  // Progress tracking
  addProgressListener(listenerId, callback) {
    this.listeners.set(listenerId, callback)
  }

  removeProgressListener(listenerId) {
    this.listeners.delete(listenerId)
  }

  notifyListeners(status, processingId, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback({ status, processingId, ...data })
      } catch (err) {
        console.error('CSV progress listener error:', err)
      }
    })
  }

  // Get current processing status
  isProcessing() {
    return this.processing
  }

  // Emergency stop
  stopProcessing() {
    console.warn('Stopping CSV processing')
    this.processing = false
    this.notifyListeners('stopped', null)
  }
}

// Singleton instance
const csvProcessor = new BackgroundCSVProcessor()

export default csvProcessor 