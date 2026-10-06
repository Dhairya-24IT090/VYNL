import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DownloadUI } from '../src/components/DownloadUI'
import type { Track } from '../src/types'

const testTrack: Track = {
  id: 'track-dl-1',
  title: 'Synth Wave Sunset',
  artist: 'Neon Wave',
  duration_seconds: 210,
  audio_url: 'https://cdn.vynl.app/sample.mp3',
}

describe('Task 7 [F6-3]: Cross-browser Download UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:https://vynl.app/mock-blob')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('downloads audio blob with progress indicator and completes successfully on desktop browser', async () => {
    const user = userEvent.setup()

    render(<DownloadUI track={testTrack} />)

    const dlBtn = screen.getByTestId(`download-button-${testTrack.id}`)
    expect(dlBtn).toBeInTheDocument()

    // Trigger download
    await user.click(dlBtn)

    // Progress bar should appear
    expect(screen.getByTestId('download-progress-bar')).toBeInTheDocument()

    // Wait for download to finish
    await waitFor(
      () => {
        expect(screen.getByTestId('download-complete-badge')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    expect(screen.getByText('Ready Offline')).toBeInTheDocument()
    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('allows user to cancel an ongoing download before completion on mobile/desktop', async () => {
    const user = userEvent.setup()

    render(<DownloadUI track={testTrack} />)

    const dlBtn = screen.getByTestId(`download-button-${testTrack.id}`)
    await user.click(dlBtn)

    // Progress bar appears
    expect(screen.getByTestId('download-progress-bar')).toBeInTheDocument()

    // User taps cancel button
    const cancelBtn = screen.getByTestId('download-cancel-button')
    await user.click(cancelBtn)

    // Progress bar removed, download reset
    await waitFor(() => {
      expect(screen.queryByTestId('download-progress-bar')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId(`download-button-${testTrack.id}`)).toBeInTheDocument()
    expect(screen.queryByTestId('download-complete-badge')).not.toBeInTheDocument()
  })
})
