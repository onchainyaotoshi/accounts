// Top 50+ most common passwords that meet the 8-char minimum length requirement
const BLOCKED_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyui', 'qwerty12', 'abcdefgh', 'abc12345', 'abcd1234',
  'iloveyou', 'trustno1', 'sunshine1', 'princess1', 'football1', 'charlie1',
  'access14', 'master12', 'diamond1', 'dragon12', 'baseball1', 'michael1',
  'shadow12', 'monkey12', 'jordan23', 'letmein1', 'mustang1', 'whatever1',
  'welcome1', 'superman1', 'batman123', 'admin123', 'admin1234', 'admin12345',
  'passw0rd', 'p@ssw0rd', 'p@ssword', 'changeme', 'test1234', 'guest1234',
  '11111111', '00000000', '12341234', 'aabbccdd', 'aaaaaaaa', 'qwer1234',
  'asdfghjk', 'zxcvbnm1', '1q2w3e4r', '1qaz2wsx', 'password12', 'password1234',
]);

export function isWeakPassword(password: string): boolean {
  return BLOCKED_PASSWORDS.has(password.toLowerCase());
}
