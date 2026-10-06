/**
 * Backdrop Management & Custom Upload Validation per Tasks 28 & 29 [F14-1, F14-2-b].
 * Offers pre-designed accessible glass backdrops and validates uploaded files
 * via magic bytes to reject disguised non-images.
 */
import React, { createContext, useContext, useState } from 'react'
import type { Backdrop } from '../types'

export const PRESET_BACKDROPS: Backdrop[] = [
  {
    id: 'obsidian-glow',
    name: 'Obsidian Glow',
    type: 'preset',
    background: 'radial-gradient(circle at 50% 20%, rgba(30, 30, 35, 0.9), #0F0F0F 80%)',
    textColor: '#FFFFFF',
  },
  {
    id: 'aurora-haze',
    name: 'Aurora Haze',
    type: 'preset',
    background: 'radial-gradient(circle at 80% 20%, rgba(45, 20, 50, 0.7), #0F0F0F 75%)',
    textColor: '#FFFFFF',
  },
  {
    id: 'velvet-dusk',
    name: 'Velvet Dusk',
    type: 'preset',
    background: 'radial-gradient(circle at 20% 80%, rgba(20, 35, 45, 0.7), #0F0F0F 75%)',
    textColor: '#FFFFFF',
  },
  {
    id: 'monochrome-glass',
    name: 'Monochrome Glass',
    type: 'preset',
    background: 'linear-gradient(180deg, #181818 0%, #0F0F0F 100%)',
    textColor: '#FFFFFF',
  },
]

export interface BackdropContextType {
  activeBackdrop: Backdrop
  presets: Backdrop[]
  selectBackdrop: (backdrop: Backdrop) => void
  uploadCustomBackdrop: (file: File) => Promise<{ success: boolean; error?: string }>
}

const BackdropContext = createContext<BackdropContextType | null>(null)

export const BackdropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeBackdrop, setActiveBackdrop] = useState<Backdrop>(PRESET_BACKDROPS[0])

  const selectBackdrop = (backdrop: Backdrop) => {
    setActiveBackdrop(backdrop)
  }

  const validateMagicBytes = async (file: File): Promise<boolean> => {
    const buffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Check PNG: 89 50 4E 47
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    // Check JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    // Check WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46

    return isPng || isJpeg || isWebp
  }

  const uploadCustomBackdrop = async (file: File): Promise<{ success: boolean; error?: string }> => {
    // 1. File size cap (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds maximum limit of 5 MB' }
    }

    // 2. MIME type check
    const validMimes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validMimes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only PNG, JPEG, and WebP are supported' }
    }

    // 3. Magic bytes verification (reject disguised scripts/binaries)
    const isValidBytes = await validateMagicBytes(file)
    if (!isValidBytes) {
      return { success: false, error: 'File validation failed: Disguised or corrupted non-image file' }
    }

    const objectUrl = URL.createObjectURL(file)
    const customBackdrop: Backdrop = {
      id: `custom-${Date.now()}`,
      name: file.name,
      type: 'custom',
      background: `url("${objectUrl}") center/cover no-repeat`,
      textColor: '#FFFFFF',
    }

    setActiveBackdrop(customBackdrop)
    return { success: true }
  }

  return (
    <BackdropContext.Provider
      value={{
        activeBackdrop,
        presets: PRESET_BACKDROPS,
        selectBackdrop,
        uploadCustomBackdrop,
      }}
    >
      {children}
    </BackdropContext.Provider>
  )
}

export const useBackdrop = (): BackdropContextType => {
  const ctx = useContext(BackdropContext)
  if (!ctx) throw new Error('useBackdrop must be used within BackdropProvider')
  return ctx
}
