export interface UploadResult {
  publicId: string
  url: string
  secureUrl: string
  format: string
  bytes: number
}

/**
 * Upload an image to Cloudinary (matches CardGuard implementation)
 * @param file - The file to upload
 * @param folder - Optional folder name for organization
 * @returns Upload result with URL and metadata
 */
export async function uploadImage(
  file: File,
  folder: string = 'kharadhu-bills'
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cardguard')
  formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '')
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const data = await response.json()
  return {
    publicId: data.public_id,
    url: data.url,
    secureUrl: data.secure_url,
    format: data.format,
    bytes: data.bytes
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    const formData = new FormData()
    formData.append('public_id', publicId)
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cardguard')
    formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Delete failed')
    }
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error)
    throw error
  }
}

/**
 * Get optimized image URL
 * @param publicId - The public ID of the image
 * @param transformations - Optional transformations
 * @returns Optimized image URL
 */
export function getOptimizedUrl(
  publicId: string,
  transformations: { width?: number; height?: number; quality?: number } = {}
): string {
  const { width = 800, height, quality = 80 } = transformations
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
  
  let url = `https://res.cloudinary.com/${cloudName}/image/upload`
  const params: string[] = []
  
  if (width) params.push(`w_${width}`)
  if (height) params.push(`h_${height}`)
  if (quality) params.push(`q_${quality}`)
  params.push('f_auto')
  params.push('q_auto')
  
  if (params.length > 0) {
    url += '/' + params.join(',')
  }
  
  url += `/${publicId}`
  return url
}
