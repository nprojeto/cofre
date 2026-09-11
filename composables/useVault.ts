import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Config = { supabaseUrl: string; supabaseAnonKey: string }

let _config: Config | null = null
let _client: SupabaseClient | null = null

export const useVault = () => {
  const base = useRuntimeConfig().app.baseURL

  async function config(): Promise<Config> {
    if (_config) return _config
    const res = await fetch(`${base}config.json`, { cache: 'no-store' })
    const data = (await res.json()) as Config
    if (!data.supabaseUrl || data.supabaseUrl.includes('COLE_AQUI')) {
      throw new Error('Preencha o arquivo config.json com os dados do Supabase.')
    }
    _config = data
    return _config
  }

  async function supabase(): Promise<SupabaseClient> {
    if (_client) return _client
    const c = await config()
    _client = createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
    return _client
  }

  async function api(path: string, opts: { method?: string; body?: any } = {}) {
    const sb = await supabase()
    const c = await config()
    const { data } = await sb.auth.getSession()
    if (!data.session) throw new Error('Sessão expirada. Entre novamente.')
    const res = await fetch(`${c.supabaseUrl}/functions/v1/api/${path}`, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.supabaseAnonKey,
        Authorization: `Bearer ${data.session.access_token}`
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(out.error || 'Não foi possível concluir.')
    return out
  }

  return { config, supabase, api }
}

const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '23456789',
  symbols: '!@#$%&*-_=+?'
}

export function generatePassword(length = 24, symbols = true): string {
  const pool = SETS.lower + SETS.upper + SETS.digits + (symbols ? SETS.symbols : '')
  const groups = [SETS.lower, SETS.upper, SETS.digits, ...(symbols ? [SETS.symbols] : [])]
  const pick = (set: string) => {
    const n = new Uint32Array(1)
    crypto.getRandomValues(n)
    return set[n[0] % set.length]
  }
  const out = groups.map(pick)
  while (out.length < length) out.push(pick(pool))
  for (let i = out.length - 1; i > 0; i--) {
    const n = new Uint32Array(1)
    crypto.getRandomValues(n)
    const j = n[0] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join('')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
