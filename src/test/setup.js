import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo and scrollIntoView
window.scrollTo = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock HTMLMediaElement methods (play, pause, load)
window.HTMLMediaElement.prototype.play = vi
  .fn()
  .mockImplementation(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

// Mock navigator.sendBeacon
if (!navigator.sendBeacon) {
  navigator.sendBeacon = vi.fn().mockReturnValue(true);
}

// Mock ResizeObserver
if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock IntersectionObserver
if (typeof IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
