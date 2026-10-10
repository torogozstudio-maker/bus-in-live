const listeners = new Map();

export const eventBus = {
  on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (!listeners.has(event)) return;
    listeners.get(event).delete(callback);
    if (listeners.get(event).size === 0) {
      listeners.delete(event);
    }
  },

  emit(event, ...args) {
    if (!listeners.has(event)) return;
    listeners.get(event).forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  },

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
    return () => this.off(event, wrapper);
  },

  clear() {
    listeners.clear();
  }
};