/**
 * Real-time network activity bus and connectivity monitor.
 * Tracks active HTTP requests, route transitions, and online/offline status.
 */

let activeRequests = 0;
const listeners = new Set();
const connectivityListeners = new Set();

function notify() {
  const isActive = activeRequests > 0;
  listeners.forEach((fn) => {
    try {
      fn({ activeRequests, isActive });
    } catch {}
  });
}

function notifyConnectivity(isOnline) {
  connectivityListeners.forEach((fn) => {
    try {
      fn(isOnline);
    } catch {}
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => notifyConnectivity(true));
  window.addEventListener("offline", () => notifyConnectivity(false));
}

export const networkBus = {
  beginRequest() {
    activeRequests += 1;
    notify();
  },

  endRequest() {
    activeRequests = Math.max(0, activeRequests - 1);
    notify();
  },

  subscribe(listener) {
    listeners.add(listener);
    // Initial call
    listener({ activeRequests, isActive: activeRequests > 0 });
    return () => listeners.delete(listener);
  },

  subscribeConnectivity(listener) {
    connectivityListeners.add(listener);
    listener(typeof navigator !== "undefined" ? navigator.onLine : true);
    return () => connectivityListeners.delete(listener);
  },

  isOnline() {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  },
};
