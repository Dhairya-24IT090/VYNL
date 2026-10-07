import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Compass,
  ListMusic,
  Sparkles,
  Award,
  Mic2,
  Activity,
  LogOut,
  LogIn,
  Settings,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const Navigation: React.FC = () => {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()

  const navItems = [
    { path: '/', label: 'Discover', icon: Compass },
  ]

  return (
    <aside
      className="glass-panel"
      style={{
        width: '240px',
        height: 'calc(100vh - 110px)',
        position: 'fixed',
        left: '20px',
        top: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        zIndex: 50,
      }}
      aria-label="Main Navigation"
    >
      <div>
        <div style={{ padding: '0 12px 24px 12px' }}>
          <h1
            className="font-display"
            style={{
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(255, 255, 255, 0.6) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            VYNL
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
            Continuous Audio
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-link-${item.path === '/' ? 'discover' : item.path.replace('/', '')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-surface-glass-active)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'background var(--duration-fast), color var(--duration-fast)',
                }}
              >
                <Icon size={18} opacity={isActive ? 1 : 0.7} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                Session Active
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link
            to="/sign-in"
            className="btn-glass"
            style={{ width: '100%', textDecoration: 'none', fontSize: '13px', padding: '8px 12px' }}
          >
            <LogIn size={15} /> Sign In
          </Link>
        )}
      </div>
    </aside>
  )
}
