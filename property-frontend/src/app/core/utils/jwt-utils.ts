export class JwtUtils {
  static decode(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  static isExpired(token: string): boolean {
    const decoded = this.decode(token);
    if (!decoded || typeof decoded['exp'] !== 'number') return true;
    return (decoded['exp'] as number) * 1000 < Date.now();
  }

  static getRole(token: string): string | null {
    const decoded = this.decode(token);
    if (!decoded) return null;
    const roles = decoded['roles'] as string[] | undefined;
    if (Array.isArray(roles) && roles.length > 0) return roles[0];
    return (decoded['role'] as string) ?? null;
  }
}
