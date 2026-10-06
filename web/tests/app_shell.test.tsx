import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient, SSEClient } from '../src/services/apiClient'

describe('Task 38 [F18-1-a]: App Shell and API Client', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    document.cookie = ''
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('automatically injects standard W3C traceparent header on outgoing requests', async () => {
    let capturedHeaders: Headers | null = null

    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      capturedHeaders = new Headers(init?.headers)
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const client = new ApiClient('https://api.vynl.app')
    await client.get('/v1/tracks')

    expect(capturedHeaders).not.toBeNull()
    const traceparent = capturedHeaders!.get('traceparent')
    expect(traceparent).toBeDefined()
    // Verify W3C traceparent format: 00-32hex-16hex-01
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
  })

  it('attaches X-CSRF-Token header on mutating requests (POST/PUT/PATCH/DELETE) when csrf cookie is present', async () => {
    document.cookie = 'csrf_token=test_csrf_token_secret_123; path=/'
    let capturedHeaders: Headers | null = null

    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      capturedHeaders = new Headers(init?.headers)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const client = new ApiClient('https://api.vynl.app')
    await client.post('/v1/playlists', { title: 'My Jams' })

    expect(capturedHeaders).not.toBeNull()
    expect(capturedHeaders!.get('X-CSRF-Token')).toBe('test_csrf_token_secret_123')
  })

  it('manages SSE streaming connections and schedules reconnection with exponential backoff on disconnect', () => {
    vi.useFakeTimers()

    const mockEventSourceInstances: any[] = []
    class MockEventSource {
      url: string
      onopen: any = null
      onmessage: any = null
      onerror: any = null
      close = vi.fn()

      constructor(url: string) {
        this.url = url
        mockEventSourceInstances.push(this)
      }
    }
    ;(globalThis as any).EventSource = MockEventSource

    const onMessage = vi.fn()
    const onError = vi.fn()
    const sse = new SSEClient('https://api.vynl.app/v1/events', onMessage, onError)

    expect(mockEventSourceInstances.length).toBe(1)
    const firstInstance = mockEventSourceInstances[0]

    // Simulate connection error
    firstInstance.onerror(new Error('SSE connection terminated'))
    expect(firstInstance.close).toHaveBeenCalled()

    // First retry scheduled after ~500ms
    vi.advanceTimersByTime(500)
    expect(mockEventSourceInstances.length).toBe(2)

    // Simulate another error on 2nd instance
    const secondInstance = mockEventSourceInstances[1]
    secondInstance.onerror(new Error('SSE network drop 2'))

    // Second retry delay is backed off (500 * 2^1 = 1000ms)
    vi.advanceTimersByTime(500)
    expect(mockEventSourceInstances.length).toBe(2) // Not yet reconnected
    vi.advanceTimersByTime(500)
    expect(mockEventSourceInstances.length).toBe(3) // Reconnected after 1000ms

    sse.close()
    vi.useRealTimers()
  })
})
