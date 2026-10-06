import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchUI } from '../src/components/SearchUI'
import { PlayerProvider } from '../src/context/PlayerContext'

describe('Task 3 [F2-6]: Search UI', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces rapid typing so that only one search request is dispatched per pause', async () => {
    vi.useFakeTimers()
    const mockSearch = vi.fn().mockResolvedValue([
      {
        id: 'track-1',
        title: 'Midnight Reverie',
        artist: 'Aura Bloom',
        duration_seconds: 200,
        audio_url: 'https://example.com/audio1.mp3',
      },
    ])

    render(
      <PlayerProvider>
        <SearchUI onSearchQuery={mockSearch} />
      </PlayerProvider>
    )

    const input = screen.getByTestId('search-input')

    // Simulate typing rapidly (keystroke updates within 250ms debounce)
    act(() => {
      fireEvent.change(input, { target: { value: 'm' } })
    })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    act(() => {
      fireEvent.change(input, { target: { value: 'mi' } })
    })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    act(() => {
      fireEvent.change(input, { target: { value: 'mid' } })
    })

    // Advance 100ms (still within the 250ms pause window)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mockSearch).not.toHaveBeenCalled()

    // Advance past the 250ms pause threshold
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Expect exactly 1 search call for the pause
    expect(mockSearch).toHaveBeenCalledTimes(1)
    expect(mockSearch).toHaveBeenCalledWith('mid')
  })

  it('displays error state with retry button upon search failure, and recovers on retry', async () => {
    let callCount = 0
    const flakySearch = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        throw new Error('Search network timeout')
      }
      return [
        {
          id: 'track-2',
          title: 'Celestial Drift',
          artist: 'Solaris Wave',
          duration_seconds: 180,
          audio_url: 'https://example.com/audio2.mp3',
        },
      ]
    })

    const user = userEvent.setup()

    render(
      <PlayerProvider>
        <SearchUI onSearchQuery={flakySearch} />
      </PlayerProvider>
    )

    const input = screen.getByTestId('search-input')
    await user.type(input, 'drift')

    // Wait for debounce and the initial failure
    await waitFor(
      () => {
        expect(screen.getByTestId('search-error-state')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
    expect(screen.getByText('Search network timeout')).toBeInTheDocument()

    // Click retry
    const retryBtn = screen.getByTestId('search-retry-button')
    await user.click(retryBtn)

    // Wait for recovery and results
    await waitFor(
      () => {
        expect(screen.queryByTestId('search-error-state')).not.toBeInTheDocument()
        expect(screen.getByTestId('search-result-track-2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
    expect(flakySearch).toHaveBeenCalledTimes(2)
  })
})
