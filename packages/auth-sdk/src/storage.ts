export class AuthStorage {
  private prefix: string;

  constructor(prefix = 'yaotoshi_auth') {
    this.prefix = prefix;
  }

  private key(name: string): string {
    return `${this.prefix}_${name}`;
  }

  get(name: string): string | null {
    try {
      return sessionStorage.getItem(this.key(name));
    } catch {
      return null;
    }
  }

  set(name: string, value: string): void {
    try {
      sessionStorage.setItem(this.key(name), value);
    } catch {
      // Storage unavailable
    }
  }

  remove(name: string): void {
    try {
      sessionStorage.removeItem(this.key(name));
    } catch {
      // Storage unavailable
    }
  }

  getPersistent(name: string): string | null {
    try {
      return localStorage.getItem(this.key(name));
    } catch {
      return null;
    }
  }

  setPersistent(name: string, value: string): void {
    try {
      localStorage.setItem(this.key(name), value);
    } catch {
      // Storage unavailable
    }
  }

  removePersistent(name: string): void {
    try {
      localStorage.removeItem(this.key(name));
    } catch {
      // Storage unavailable
    }
  }

  clearAll(): void {
    try {
      const prefix = this.prefix + '_';
      for (const store of [sessionStorage, localStorage]) {
        const keys = Object.keys(store).filter(k => k.startsWith(prefix));
        keys.forEach(k => store.removeItem(k));
      }
    } catch {
      // Storage unavailable
    }
  }
}
