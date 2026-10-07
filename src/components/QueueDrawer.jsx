/**
 * Queue Drawer Component per Task 39 [F18-2].
 * Displays the active audio queue, allowing track selection, reordering,
 * and removal with glassmorphic animations.
 */
import React from "react";
import { Play, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export const QueueDrawer = ({ isOpen, onClose }) => {
  const { queue, currentTrack, playTrack, removeFromQueue, reorderQueue } =
    usePlayer();

  if (!isOpen) return null;

  return (
    <aside
      className="glass-panel"
      data-testid="queue-drawer"
      style={{
        position: "fixed",
        right: "20px",
        bottom: "110px",
        width: "360px",
        maxHeight: "480px",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        backgroundColor: "rgba(20, 20, 24, 0.95)",
        boxShadow: "var(--shadow-floating)",
      }}
      aria-label="Playback Queue"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>
          Up Next ({queue.length})
        </h3>
        <button
          onClick={onClose}
          aria-label="Close Queue"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {queue.length === 0 ? (
          <div
            style={{
              padding: "24px 0",
              textAlign: "center",
              color: "var(--color-text-tertiary)",
              fontSize: "13px",
            }}
          >
            Queue is empty
          </div>
        ) : (
          queue.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                data-testid={`queue-item-${track.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: isCurrent
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: isCurrent
                    ? "1px solid rgba(255, 255, 255, 0.2)"
                    : "1px solid transparent",
                }}
              >
                <div
                  onClick={() => playTrack(track)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isCurrent ? (
                      <Play size={12} fill="#FFFFFF" />
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#FFFFFF",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {track.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-tertiary)",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {track.artist}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {idx > 0 && (
                    <button
                      onClick={() => reorderQueue(idx, idx - 1)}
                      aria-label="Move Up"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-text-tertiary)",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <ArrowUp size={14} />
                    </button>
                  )}
                  {idx < queue.length - 1 && (
                    <button
                      onClick={() => reorderQueue(idx, idx + 1)}
                      aria-label="Move Down"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-text-tertiary)",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <ArrowDown size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => removeFromQueue(track.id)}
                    aria-label="Remove From Queue"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--color-text-tertiary)",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
