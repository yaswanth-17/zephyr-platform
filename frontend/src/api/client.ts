// api/client.ts — typed API calls to the FastAPI backend

import type {
  Binding, Board, SearchResult,
  GenerateRequest, GenerateResult,
  ValidateRequest, ValidateResult
} from '../types'

const BASE = '/api'

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v) })
  }
  console.log('[API GET]', url.toString())
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    console.error('[API ERROR]', res.status, text)
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = BASE + path
  console.log('[API POST]', url, body)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('[API ERROR]', res.status, text)
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

// --- Categories ---
export const getCategories = () =>
  get<{ categories: string[]; total: number }>('/dts/categories')

// --- Bindings ---
export const getBindings = (filters?: { category?: string; vendor?: string; soc?: string }) =>
  get<{ total: number; bindings: Binding[] }>('/dts/bindings', filters as Record<string, string>)

export const getBinding = (compatible: string) =>
  get<Binding>(`/dts/bindings/${encodeURIComponent(compatible)}`)

// --- SoCs ---
export const getSoCs = (vendor?: string) =>
  get<{ socs: string[]; total: number }>('/socs', vendor ? { vendor } : undefined)

// --- Boards ---
export const getBoards = (filters?: { soc?: string; vendor?: string; arch?: string }) =>
  get<{ total: number; boards: Board[] }>('/boards', filters as Record<string, string>)

// --- Search ---
export const search = (q: string, limit = 20) =>
  get<{ query: string; total: number; results: SearchResult[] }>('/search', { q, limit: String(limit) })

// --- DTS Generate (Mode A) ---
export const generateDTS = (req: GenerateRequest) =>
  post<GenerateResult>('/dts/generate', req)

// --- DTS Validate (Mode B) ---
export const validateDTS = (req: ValidateRequest) =>
  post<ValidateResult>('/dts/validate', req)
