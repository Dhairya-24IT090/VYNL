import { EventBuffer, eventBuffer } from '../src/services/eventBuffer'

describe('Task 31 [F15-4]: Client Event Buffer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    navigator.sendBeacon = vi.fn().mockReturnValue(true)
    // Destroy singleton listeners for clean isolated unit tests
    eventBuffer.destroy()
  })

  it('immediately persists queued telemetry events to localStorage', () => {
    const bufferInstance = new EventBuffer()

    bufferInstance.push({
      event_type: 'play',
      track_id: 't-123',
      context: 'search_result',
    })

    const stored = JSON.parse(localStorage.getItem('vynl_event_buffer') || '[]')
    expect(stored.length).toBe(1)
    expect(stored[0].track_id).toBe('t-123')
    expect(stored[0].event_type).toBe('play')

    bufferInstance.destroy()
  })

  it('restores buffered events from localStorage on initial load if tab was previously closed', () => {
    // Pre-seed localStorage as if left over from a closed tab
    const previousEvents = [
      { event_type: 'pause', track_id: 't-999', timestamp: 123456789 },
      { event_type: 'seek', track_id: 't-999', timestamp: 123456799 },
    ]
    localStorage.setItem('vynl_event_buffer', JSON.stringify(previousEvents))

    const newBufferInstance = new EventBuffer()
    const pending = newBufferInstance.getPendingEvents()

    expect(pending.length).toBe(2)
    expect(pending[0].event_type).toBe('pause')
    expect(pending[1].event_type).toBe('seek')

    newBufferInstance.destroy()
  })

  it('dispatches unsent events via navigator.sendBeacon upon beforeunload or pagehide', () => {
    const bufferInstance = new EventBuffer()

    bufferInstance.push({
      event_type: 'download',
      track_id: 't-456',
    })

    // Simulate tab closing event
    window.dispatchEvent(new Event('beforeunload'))

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1)
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      '/v1/activity/batch',
      expect.any(Blob)
    )

    bufferInstance.destroy()
  })
})
