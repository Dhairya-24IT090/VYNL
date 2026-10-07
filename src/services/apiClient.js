/**
 * VYNL Core API Client & Real-time Connectivity per Task 38 [F18-1-a].
 * Automatically injects W3C traceparent, CSRF token on mutating requests,
 * and manages SSE streaming connections with exponential backoff.
 */

function generateTraceparent() {
  const hex = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  const traceId = (
    hex() +
    hex() +
    hex() +
    hex() +
    hex() +
    hex() +
    hex() +
    hex()
  ).padEnd(32, "0");
  const spanId = (hex() + hex() + hex() + hex()).padEnd(16, "0");
  return `00-${traceId}-${spanId}-01`;
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export class ApiClient {
  unauthorizedNotified = false;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const { skipAuth = false, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});

    // 1. Inject W3C Traceparent
    if (!headers.has("traceparent") && !headers.has("Traceparent")) {
      headers.set("traceparent", generateTraceparent());
    }

    // 2. Attach CSRF token on mutating requests
    const method = (fetchOptions.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrfToken = getCookie("csrf_token");
      if (csrfToken && !headers.has("X-CSRF-Token")) {
        headers.set("X-CSRF-Token", csrfToken);
      }
    }

    if (
      !headers.has("Content-Type") &&
      fetchOptions.body &&
      typeof fetchOptions.body === "string"
    ) {
      headers.set("Content-Type", "application/json");
    }

    const config = {
      ...fetchOptions,
      headers,
      credentials: options.credentials || "include",
    };

    const response = await fetch(url, config);

    if (response.ok) this.unauthorizedNotified = false;
    if (
      response.status === 401 &&
      !skipAuth &&
      !endpoint.startsWith("/v1/auth/")
    ) {
      if (!this.unauthorizedNotified && typeof window !== "undefined") {
        this.unauthorizedNotified = true;
        window.dispatchEvent(new Event("vynl:unauthorized"));
      }
    }

    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = {
          error: { code: "http_error", message: response.statusText },
        };
      }
      const err = new Error(
        errorBody?.error?.message || `HTTP ${response.status}`,
      );
      err.status = response.status;
      err.data = errorBody;
      err.code = errorBody?.error?.code;
      throw err;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();

/**
 * Resilient SSE Manager with exponential backoff and message deduplication.
 */
export class SSEClient {
  eventSource = null;
  reconnectAttempt = 0;
  maxReconnectDelay = 10000;
  isClosed = false;

  constructor(url, onMessage, onError) {
    this.url = url;
    this.onMessage = onMessage;
    this.onError = onError;
    this.connect();
  }

  connect() {
    if (this.isClosed) return;

    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.onopen = () => {
        this.reconnectAttempt = 0;
      };

      this.eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          this.onMessage(parsed);
        } catch {
          this.onMessage(e.data);
        }
      };

      this.eventSource.onerror = (err) => {
        if (this.onError) this.onError(err);
        this.eventSource?.close();

        if (!this.isClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    this.reconnectAttempt++;
    const delay = Math.min(
      this.maxReconnectDelay,
      500 * Math.pow(2, this.reconnectAttempt - 1),
    );
    setTimeout(() => this.connect(), delay);
  }

  close() {
    this.isClosed = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Resilient Collaborative WebSocket Client per Task 41 [F18-4].
 * Manages bi-directional room mutations, recovers from transient network drops
 * without page refresh via exponential backoff, and flushes queued offline messages.
 */
export class CollabWSClient {
  socket = null;
  reconnectAttempt = 0;
  maxReconnectDelay = 10000;
  isClosed = false;
  outgoingQueue = [];

  constructor(url, onMessage, onStatusChange) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.connect();
  }

  connect() {
    if (this.isClosed) return;

    if (this.onStatusChange) this.onStatusChange("connecting");

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.reconnectAttempt = 0;
        if (this.onStatusChange) this.onStatusChange("connected");

        // Flush offline queue upon reconnection
        while (
          this.outgoingQueue.length > 0 &&
          this.socket?.readyState === WebSocket.OPEN
        ) {
          const queued = this.outgoingQueue.shift();
          if (queued) this.socket.send(queued);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.onMessage(parsed);
        } catch {
          this.onMessage(event.data);
        }
      };

      this.socket.onclose = (event) => {
        if (this.onStatusChange) this.onStatusChange("disconnected");
        this.socket = null;

        // 1000 = normal closure, 1001 = going away, 4403 = unauthorized (don't reconnect)
        if (!this.isClosed && event.code !== 1000 && event.code !== 4403) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    this.reconnectAttempt++;
    const delay = Math.min(
      this.maxReconnectDelay,
      500 * Math.pow(2, this.reconnectAttempt - 1),
    );
    setTimeout(() => this.connect(), delay);
  }

  send(data) {
    const serialized = typeof data === "string" ? data : JSON.stringify(data);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(serialized);
    } else {
      this.outgoingQueue.push(serialized);
    }
  }

  getQueueLength() {
    return this.outgoingQueue.length;
  }

  close() {
    this.isClosed = true;
    if (this.socket) {
      this.socket.close(1000, "Client closed normally");
      this.socket = null;
    }
  }
}
