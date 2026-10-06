import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Playlist } from '../types'
import { api } from '../services/apiClient'
import { PlaylistUI } from '../components/PlaylistUI'
import { CollaborationUI } from '../components/CollaborationUI'

export const PlaylistDetailPage: React.FC = () => {
  const { id = '' } = useParams()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api.get<Playlist>(`/v1/playlists/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(setPlaylist)
      .catch((err: Error & { status?: number }) => {
        if (!controller.signal.aborted) setError(err.status === 404 ? 'Playlist not found' : err.message)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id])

  if (loading) return <div role="status">Loading playlist…</div>
  if (error || !playlist) return <section><h1>Playlist unavailable</h1><p role="alert">{error || 'Playlist not found'}</p><Link to="/playlists">Back to playlists</Link></section>
  return (
    <section data-testid="playlist-detail">
      <Link to="/playlists">Back to playlists</Link>
      {playlist.is_collaborative ? <CollaborationUI playlist={playlist} /> : <PlaylistUI initialPlaylist={playlist} />}
    </section>
  )
}
