import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerformanceDashboard, DEFAULT_PERF_METRICS } from '../src/components/PerformanceDashboard'

describe('Task 5 [F3-19-b]: Performance Targets Dashboard', () => {
  it('renders all key performance metrics showing p95 values vs target SLAs', () => {
    render(<PerformanceDashboard />)

    expect(screen.getByTestId('perf-dashboard')).toBeInTheDocument()
    expect(screen.getByText('Performance Metrics Dashboard')).toBeInTheDocument()

    // Verify key metrics: TTFB, LCP, INP, Audio Start, Lyric Seek
    for (const metric of DEFAULT_PERF_METRICS) {
      const card = screen.getByTestId(`metric-card-${metric.id}`)
      expect(card).toBeInTheDocument()

      const p95El = screen.getByTestId(`metric-p95-${metric.id}`)
      expect(p95El).toHaveTextContent(`${metric.p95Value} ${metric.unit}`)

      expect(card).toHaveTextContent(`TARGET: ${metric.target}`)

      const statusEl = screen.getByTestId(`metric-status-${metric.id}`)
      expect(statusEl).toHaveTextContent('PASS')
    }
  })

  it('correctly flags breached targets as WARN when p95 exceeds SLA', () => {
    const customMetrics = [
      {
        id: 'ttfb-breached',
        name: 'Time to First Byte (TTFB)',
        target: '< 200 ms',
        targetValue: 200,
        p95Value: 350, // exceeds 200ms
        unit: 'ms',
        description: 'Server latency under heavy load',
      },
    ]

    render(<PerformanceDashboard metrics={customMetrics} />)

    const statusEl = screen.getByTestId('metric-status-ttfb-breached')
    expect(statusEl).toHaveTextContent('WARN')

    const p95El = screen.getByTestId('metric-p95-ttfb-breached')
    expect(p95El).toHaveTextContent('350 ms')
  })
})
