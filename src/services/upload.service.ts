import { v2 as cloudinary, type UploadApiErrorResponse, type UploadApiResponse } from 'cloudinary'

import { env } from '../config/env'
import { AppError, badRequest } from '../utils/AppError'

/**
 * The only two things the portfolio stores images for. Deliberately not a
 * generic media library: each kind maps to one Cloudinary folder, and the
 * caller saves the returned URL on the profile or project record itself.
 */
export const IMAGE_KINDS = ['profile', 'project'] as const
export type ImageKind = (typeof IMAGE_KINDS)[number]

const FOLDERS: Record<ImageKind, string> = {
  profile: 'profile',
  project: 'projects',
}

/**
 * Uploads admin images to Cloudinary and hands back the delivery URL.
 *
 * The API secret never leaves the server — the browser posts the file here,
 * and only the public https URL goes back. Nothing about the upload is
 * persisted by this service; the URL is stored by the normal profile/project
 * update, so the database holds a plain string and nothing Cloudinary-specific.
 */
export class UploadService {
  private readonly configured: boolean

  constructor() {
    const { cloudName, apiKey, apiSecret } = env.cloudinary
    this.configured = Boolean(cloudName && apiKey && apiSecret)

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      })
    }
  }

  async uploadImage(file: Buffer, kind: ImageKind): Promise<{ url: string }> {
    if (!this.configured) {
      throw new AppError('Image uploads are not configured on the server', 503)
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${env.cloudinary.folder}/${FOLDERS[kind]}`,
          resource_type: 'image',
          // Cloudinary inspects the bytes, so a renamed non-image is rejected
          // here even if it slipped past the MIME check in the route.
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          // Cap the stored original; a 6000px phone photo is never displayed
          // anywhere near that size.
          transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
        },
        (error?: UploadApiErrorResponse, response?: UploadApiResponse) => {
          if (error || !response) reject(error ?? new Error('Empty response from Cloudinary'))
          else resolve(response)
        }
      )
      stream.end(file)
    }).catch((error: unknown) => {
      const cloudinaryError = error as Partial<UploadApiErrorResponse>
      if (cloudinaryError.http_code === 400) {
        throw badRequest(`The image was rejected: ${cloudinaryError.message ?? 'invalid file'}`)
      }
      console.error('[upload] Cloudinary upload failed:', error)
      throw new AppError('Image upload failed. Please try again.', 502)
    })

    return { url: result.secure_url }
  }
}
