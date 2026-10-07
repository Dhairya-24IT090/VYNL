/**
 * Client Event Buffer per Task 31 [F15-4].
 * Buffers interaction telemetry in localStorage, flushes on interval,
 * and executes navigator.sendBeacon on tab close/unload to prevent data loss.
 */

const STORAGE_KEY = "vynl_event_buffer";
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_ENDPOINT = "/v1/activity/batch";

export class EventBuffer {
  buffer = [];
  flushTimer = null;

  constructor() {
    this.loadFromStorage();
    this.startPeriodicFlush();
    this.installUnloadListener();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.buffer = JSON.parse(stored);
      }
    } catch {
      this.buffer = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buffer));
    } catch {
      // Storage quota or unavailable
    }
  }

  push(event) {
    const fullEvent = {
      ...event,
      timestamp: Date.now(),
    };
    this.buffer.push(fullEvent);
    this.saveToStorage();
  }

  getPendingEvents() {
    return [...this.buffer];
  }

  async flush() {
    if (this.buffer.length === 0) return true;

    const payload = [...this.buffer];
    try {
      const res = await fetch(FLUSH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: payload }),
      });
      if (res.ok) {
        this.buffer = this.buffer.slice(payload.length);
        this.saveToStorage();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  flushBeacon() {
    if (this.buffer.length === 0) return true;
    const payload = JSON.stringify({ events: this.buffer });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        FLUSH_ENDPOINT,
        new Blob([payload], { type: "application/json" }),
      );
      if (sent) {
        this.buffer = [];
        localStorage.removeItem(STORAGE_KEY);
      }
      return sent;
    }
    return false;
  }

  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  unloadHandler = () => {
    this.flushBeacon();
  };

  installUnloadListener() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.unloadHandler);
      window.addEventListener("pagehide", this.unloadHandler);
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.unloadHandler);
      window.removeEventListener("pagehide", this.unloadHandler);
    }
  }
}

export const eventBuffer = new EventBuffer();
