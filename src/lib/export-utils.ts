import { format } from 'date-fns'

export interface ExportOptions {
  format: 'csv' | 'json'
  filename?: string
  delimiter?: 'comma' | 'semicolon' | 'tab'
  encoding?: 'utf-8' | 'windows-1252'
  dateFormat?: 'iso' | 'us' | 'eu'
}

export interface ExportField {
  key: string
  label: string
  type?: 'string' | 'number' | 'date' | 'boolean' | 'array'
  transform?: (value: any) => string
}

/**
 * Utility function to escape CSV values
 */
export function escapeCsvValue(value: string, delimiter: string = ','): string {
  if (typeof value !== 'string') {
    value = String(value)
  }
  
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Get delimiter character from delimiter type
 */
export function getDelimiter(delimiterType: string): string {
  switch (delimiterType) {
    case 'semicolon': return ';'
    case 'tab': return '\t'
    default: return ','
  }
}

/**
 * Format date according to specified format
 */
export function formatDate(date: Date | string | null, dateFormat: string = 'iso'): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return ''
  
  switch (dateFormat) {
    case 'us':
      return dateObj.toLocaleDateString('en-US')
    case 'eu':
      return dateObj.toLocaleDateString('en-GB')
    default:
      return dateObj.toISOString()
  }
}

/**
 * Transform array values to string
 */
export function formatArrayValue(value: any[]): string {
  if (!Array.isArray(value)) return ''
  return value.join('; ')
}

/**
 * Generate CSV content from data and fields
 */
export function generateCsv<T extends Record<string, any>>(
  data: T[],
  fields: ExportField[],
  options: ExportOptions = { format: 'csv' }
): string {
  const delimiter = getDelimiter(options.delimiter || 'comma')
  
  // Generate headers
  const headers = fields.map(field => field.label)
  
  // Generate rows
  const rows = data.map(item => 
    fields.map(field => {
      let value = item[field.key]
      
      // Apply transformations based on field type
      if (field.transform) {
        value = field.transform(value)
      } else {
        switch (field.type) {
          case 'date':
            value = formatDate(value, options.dateFormat)
            break
          case 'array':
            value = formatArrayValue(value)
            break
          case 'boolean':
            value = value ? 'Yes' : 'No'
            break
          case 'number':
            value = value?.toString() || ''
            break
          default:
            value = value?.toString() || ''
        }
      }
      
      return escapeCsvValue(value, delimiter)
    })
  )
  
  // Combine headers and rows
  return [
    headers.join(delimiter),
    ...rows.map(row => row.join(delimiter))
  ].join('\n')
}

/**
 * Generate JSON content with metadata
 */
export function generateJson<T extends Record<string, any>>(
  data: T[],
  metadata?: Record<string, any>
): string {
  const exportData = {
    data,
    metadata: {
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      ...metadata
    }
  }
  
  return JSON.stringify(exportData, null, 2)
}

/**
 * Download content as file
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(
  baseName: string,
  fileFormat: string,
  includeTimestamp: boolean = true
): string {
  const timestamp = includeTimestamp ? `-${format(new Date(), 'yyyy-MM-dd-HHmm')}` : ''
  return `${baseName}${timestamp}.${fileFormat}`
}

/**
 * Quick export function for simple use cases
 */
export async function quickExport<T extends Record<string, any>>(
  data: T[],
  fields: ExportField[],
  options: ExportOptions & { filename: string }
): Promise<void> {
  try {
    let content: string
    let mimeType: string
    
    if (options.format === 'json') {
      content = generateJson(data)
      mimeType = 'application/json'
    } else {
      content = generateCsv(data, fields, options)
      mimeType = 'text/csv'
      
      // Handle encoding for CSV
      if (options.encoding === 'windows-1252') {
        mimeType = 'text/csv; charset=windows-1252'
      } else {
        mimeType = 'text/csv; charset=utf-8'
      }
    }
    
    const filename = generateFilename(
      options.filename.replace(/\.[^/.]+$/, ''), // Remove extension
      options.format
    )
    
    downloadFile(content, filename, mimeType)
  } catch (error) {
    console.error('Export error:', error)
    throw new Error('Failed to generate export file')
  }
}

/**
 * Validate export data
 */
export function validateExportData<T extends Record<string, any>>(
  data: T[],
  fields: ExportField[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!Array.isArray(data)) {
    errors.push('Data must be an array')
  }
  
  if (!Array.isArray(fields) || fields.length === 0) {
    errors.push('At least one field must be specified')
  }
  
  if (data.length === 0) {
    errors.push('No data to export')
  }
  
  // Check if all field keys exist in data
  if (data.length > 0) {
    const sampleItem = data[0]
    fields.forEach(field => {
      if (!(field.key in sampleItem)) {
        errors.push(`Field '${field.key}' not found in data`)
      }
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get file size estimate
 */
export function estimateFileSize(
  data: any[],
  fields: ExportField[],
  format: 'csv' | 'json'
): number {
  if (data.length === 0) return 0
  
  // Rough estimation based on average field length
  const avgFieldLength = 20 // Assumed average characters per field
  const overhead = format === 'json' ? 0.3 : 0.1 // JSON has more overhead
  
  const baseSize = data.length * fields.length * avgFieldLength
  return Math.round(baseSize * (1 + overhead))
}

/**
 * Check if export is too large for browser handling
 */
export function isExportTooLarge(
  data: any[],
  fields: ExportField[],
  format: 'csv' | 'json',
  maxSize: number = 50 * 1024 * 1024 // 50MB default
): boolean {
  return estimateFileSize(data, fields, format) > maxSize
}

/**
 * Split large exports into chunks
 */
export function splitExportData<T>(
  data: T[],
  chunkSize: number = 10000
): T[][] {
  const chunks: T[][] = []
  
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize))
  }
  
  return chunks
}