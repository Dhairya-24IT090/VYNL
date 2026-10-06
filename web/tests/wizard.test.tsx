import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerationWizard } from '../src/components/GenerationWizard'

describe('Task 11 [F9-5]: AI Playlist Generation Wizard UI', () => {
  it('allows user to adjust seeds, generate draft, and save as playlist without leaving flow', async () => {
    const user = userEvent.setup()
    const handleSaveSuccess = vi.fn()

    render(<GenerationWizard onSaveSuccess={handleSaveSuccess} />)

    expect(screen.getByTestId('wizard-container')).toBeInTheDocument()
    expect(screen.getByText('AI Playlist Generator')).toBeInTheDocument()

    // 1. Adjust seeds: select genres and moods
    const ambientGenre = screen.getByTestId('genre-Ambient')
    await user.click(ambientGenre)

    const chillMood = screen.getByTestId('mood-Meditative Calm')
    await user.click(chillMood)

    // 2. Generate draft
    const generateBtn = screen.getByTestId('generate-button')
    await user.click(generateBtn)

    // Draft preview appears with tracks
    await waitFor(() => {
      expect(screen.getByTestId('draft-preview-panel')).toBeInTheDocument()
    })
    const panel = screen.getByTestId('draft-preview-panel')
    expect(panel).toHaveTextContent('Meditative Calm')
    expect(screen.getByTestId('draft-item-track-1')).toBeInTheDocument()

    // 3. Save as persistent playlist directly in flow
    const saveBtn = screen.getByTestId('save-playlist-button')
    expect(saveBtn).toBeInTheDocument()
    await user.click(saveBtn)

    // Success state confirmed without navigating away or closing modal
    await waitFor(() => {
      expect(screen.getByText('Saved as Playlist!')).toBeInTheDocument()
    })
    expect(handleSaveSuccess).toHaveBeenCalledTimes(1)
    expect(handleSaveSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Meditative Calm'),
        draft_id: expect.stringMatching(/^draft-/),
      })
    )
  })
})
