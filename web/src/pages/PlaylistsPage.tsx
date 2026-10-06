import React, { useState } from 'react'
import { Users, ListMusic } from 'lucide-react'
import { PlaylistUI } from '../components/PlaylistUI'
import { CollaborationUI } from '../components/CollaborationUI'
import { SAMPLE_PLAYLISTS } from '../data/mockData'

export const PlaylistsPage: React.FC = () => {
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState<number>(0)
  const [isCollabMode, setIsCollabMode] = useState<boolean>(false)

  const activePlaylist = SAMPLE_PLAYLISTS[selectedPlaylistIndex]

  return (
    <div data-testid="page-playlists">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '28px', color: '#FFFFFF', marginBottom: '6px' }}>
            Your Playlists
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Manage personal selections and real-time collaborative rooms.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="tab-personal-playlist"
            onClick={() => {
              setSelectedPlaylistIndex(0)
              setIsCollabMode(false)
            }}
            className={!isCollabMode ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <ListMusic size={15} /> Personal
          </button>
          <button
            data-testid="tab-collab-playlist"
            onClick={() => {
              setSelectedPlaylistIndex(1)
              setIsCollabMode(true)
            }}
            className={isCollabMode ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Users size={15} /> Collab Room
          </button>
        </div>
      </div>

      {isCollabMode ? (
        <CollaborationUI playlist={activePlaylist} />
      ) : (
        <PlaylistUI initialPlaylist={activePlaylist} />
      )}
    </div>
  )
}
