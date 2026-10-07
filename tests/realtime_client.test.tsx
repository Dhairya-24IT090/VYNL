import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CollabWSClient } from '../src/services/apiClient'

describe('Task 41 [F18-4]: Real-time clients recover from network drops without page refresh', () => {
  let mockSocketInstances: any[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    mockSocketInstances = []

    class MockWebSocket {
      static OPEN = 1
      static CLOSED = 3

      url: string
      readyState: number = MockWebSocket.OPEN
      onopen: any = null
      onmessage: any = null
      onclose: any = null
      onerror: any = null
      sentMessages: string[] = []

      constructor(url: string) {
        this.url = url
        mockSocketInstances.push(this)
        setTimeout(() => {
          if (this.onopen) this.onopen()
        }, 10)
      }

      send(data: string) {
        this.sentMessages.push(data)
      }

      close(code: number = 1000, reason?: string) {
        this.readyState = MockWebSocket.CLOSED
        if (this.onclose) this.onclose({ code, reason })
      }
    }

    ;(globalThis as any).WebSocket = MockWebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('recovers from transient network disconnect (code 1006) automatically via exponential backoff without refreshing', () => {
    const onMessage = vi.fn()
    const onStatus = vi.fn()

    const wsClient = new CollabWSClient('wss://api.vynl.app/v1/playlists/pl-1/ws', onMessage, onStatus)

    expect(mockSocketInstances.length).toBe(1)
    // Connect initial socket
    vi.advanceTimersByTime(20)
    expect(onStatus).toHaveBeenCalledWith('connected')

    // Simulate unexpected network drop (TCP reset / code 1006)
    const socket1 = mockSocketInstances[0]
    socket1.close(1006, 'Abnormal network closure')

    expect(onStatus).toHaveBeenCalledWith('disconnected')

    // Before backoff expires, no new socket yet
    vi.advanceTimersByTime(200)
    expect(mockSocketInstances.length).toBe(1)

    // Advance 500ms for first backoff reconnect
    vi.advanceTimersByTime(350)
    expect(mockSocketInstances.length).toBe(2)

    // New socket connects successfully
    vi.advanceTimersByTime(20)
    expect(onStatus).toHaveBeenLastCalledWith('connected')

    wsClient.close()
  })

  it('queues mutations emitted during network drop and flushes them upon automatic reconnection', () => {
    const onMessage = vi.fn()
    const wsClient = new CollabWSClient('wss://api.vynl.app/v1/playlists/pl-1/ws', onMessage)

    // Let socket 1 open
    vi.advanceTimersByTime(20)
    const socket1 = mockSocketInstances[0]

    // Disconnect socket 1 unexpectedly
    socket1.close(1006, 'Transient drop')

    // User attempts to edit playlist while disconnected
    wsClient.send({ action: 'add_item', track_id: 't-new' })
    expect(wsClient.getQueueLength()).toBe(1)

    // Reconnection triggers after backoff
    vi.advanceTimersByTime(550)
    expect(mockSocketInstances.length).toBe(2)
    const socket2 = mockSocketInstances[1]

    // Socket 2 opens, queue is flushed
    vi.advanceTimersByTime(20)
    expect(socket2.sentMessages.length).toBe(1)
    expect(socket2.sentMessages[0]).toContain('add_item')
    expect(wsClient.getQueueLength()).toBe(0)

    wsClient.close()
  })
})
