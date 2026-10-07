import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LyricsScreen } from '../src/components/LyricsScreen'
import { BackdropProvider } from '../src/context/BackdropContext'
import { PlayerProvider } from '../src/context/PlayerContext'

describe('Task 29 [F14-2-b]: Custom Backdrop Upload and Magic Byte Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:https://vynl.app/custom-bdrop')
  })

  it('rejects disguised non-image files with mismatched magic bytes even if named .png', async () => {
    const user = userEvent.setup()

    render(
      <BackdropProvider>
        <PlayerProvider>
          <LyricsScreen />
        </PlayerProvider>
      </BackdropProvider>
    )

    // Disguised script file pretending to be image/png
    const disguisedBytes = new TextEncoder().encode('<html><script>alert(1)</script></html>')
    const fakeImageFile = new File([disguisedBytes], 'malicious.png', {
      type: 'image/png',
    })

    const fileInput = screen.getByTestId('custom-backdrop-input')
    await user.upload(fileInput, fakeImageFile)

    // Error banner appears indicating rejected disguised file
    await waitFor(() => {
      expect(screen.getByTestId('upload-error-banner')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/Disguised or corrupted non-image file/i)
    ).toBeInTheDocument()
  })

  it('accepts genuine image file with valid PNG magic header bytes', async () => {
    const user = userEvent.setup()

    render(
      <BackdropProvider>
        <PlayerProvider>
          <LyricsScreen />
        </PlayerProvider>
      </BackdropProvider>
    )

    // Valid PNG magic bytes: 0x89, 0x50, 0x4E, 0x47
    const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    const validImageFile = new File([validPngBytes], 'wallpaper.png', {
      type: 'image/png',
    })

    const fileInput = screen.getByTestId('custom-backdrop-input')
    await user.upload(fileInput, validImageFile)

    // No error banner and backdrop is accepted
    await waitFor(() => {
      expect(screen.queryByTestId('upload-error-banner')).not.toBeInTheDocument()
    })
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(validImageFile)
  })
})
