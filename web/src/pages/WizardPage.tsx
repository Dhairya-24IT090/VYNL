import React from 'react'
import { GenerationWizard } from '../components/GenerationWizard'

export const WizardPage: React.FC = () => {
  return (
    <div data-testid="page-wizard">
      <GenerationWizard />
    </div>
  )
}
