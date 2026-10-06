import React from 'react'
import { PerformanceDashboard } from '../components/PerformanceDashboard'

export const MetricsPage: React.FC = () => {
  return (
    <div data-testid="page-metrics">
      <PerformanceDashboard />
    </div>
  )
}
