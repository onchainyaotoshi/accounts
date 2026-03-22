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
    return this.get(name);
  }

  setPersistent(name: string, value: string): void {
    this.set(name, value);
  }

  removePersistent(name: string): void {
    this.remove(name);
  }

  clearAll(): void {
    try {
      const prefix = this.prefix + '_';
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith(prefix));
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch {
      // Storage unavailable
    }
  }
}
