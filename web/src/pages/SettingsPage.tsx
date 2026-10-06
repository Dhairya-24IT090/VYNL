import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/apiClient'

export const SettingsPage: React.FC = () => {
  const { logout } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteAccount = async () => {
    setWorking(true)
    setError(null)
    try {
      await api.delete('/v1/users/me')
      await logout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account deletion failed')
    } finally {
      setWorking(false)
    }
  }

  return (
    <section data-testid="settings-page">
      <h1>Settings</h1>
      <h2>Account</h2>
      <p>Delete your account and request removal of its personal data.</p>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)}>Delete account</button>
      ) : (
        <div role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-description">
          <h2 id="delete-title">Confirm account deletion</h2>
          <p id="delete-description">This action removes your account data and signs you out.</p>
          <button type="button" disabled={working} onClick={() => void deleteAccount()}>{working ? 'Deleting…' : 'Confirm deletion'}</button>
          <button type="button" disabled={working} onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
