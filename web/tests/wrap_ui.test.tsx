import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { WrapUI } from '../src/components/WrapUI'
import { EMPTY_WRAP, SAMPLE_WRAP } from '../src/data/mockData'

describe('Task 37 [F17-6]: Monthly Wrap UI', () => {
  it('renders rich statistics when listening history is present', () => {
    render(<WrapUI initialWrap={SAMPLE_WRAP} />)

    expect(screen.getByTestId('wrap-container')).toBeInTheDocument()
    expect(screen.getByText(/Monthly Wrap/)).toBeInTheDocument()
    expect(screen.getByTestId('stat-minutes')).toBeInTheDocument()
    expect(screen.getByTestId('stat-streak')).toBeInTheDocument()

    // Key metrics rendered
    expect(screen.getByText('4,320')).toBeInTheDocument() // Minutes
    expect(screen.getByTestId('stat-streak')).toHaveTextContent('19')
    expect(screen.getByTestId('stat-streak')).toHaveTextContent('Consecutive active days')
    expect(screen.queryByTestId('wrap-empty-state')).not.toBeInTheDocument()
  })

  it('gracefully renders an informative empty state when user has zero listening history', () => {
    render(<WrapUI initialWrap={EMPTY_WRAP} />)

    expect(screen.getByTestId('wrap-container')).toBeInTheDocument()
    // Empty state container rendered cleanly
    expect(screen.getByTestId('wrap-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/No Listening History for/)).toBeInTheDocument()
    expect(
      screen.getByText(/Start playing tracks, creating playlists, or testing the AI wizard/i)
    ).toBeInTheDocument()

    // Rich stats cards should not render
    expect(screen.queryByTestId('stat-minutes')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stat-streak')).not.toBeInTheDocument()
  })

  it('allows switching seamlessly between full history and zero history modes', () => {
    render(<WrapUI initialWrap={SAMPLE_WRAP} />)

    expect(screen.getByTestId('stat-minutes')).toBeInTheDocument()

    // Toggle to zero history
    act(() => {
      screen.getByTestId('toggle-empty-wrap').click()
    })
    expect(screen.getByTestId('wrap-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-minutes')).not.toBeInTheDocument()

    // Toggle back to full history
    act(() => {
      screen.getByTestId('toggle-sample-wrap').click()
    })
    expect(screen.getByTestId('stat-minutes')).toBeInTheDocument()
    expect(screen.queryByTestId('wrap-empty-state')).not.toBeInTheDocument()
  })
})
