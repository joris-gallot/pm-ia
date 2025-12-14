export function getEnvironment(): 'local' | 'production' {
  const hostname = window.location.hostname

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return 'local'
  }

  return 'production'
}

export function isProd(): boolean {
  const env = getEnvironment()

  return env === 'production'
}
