// types/index.ts — all shared TypeScript interfaces

export interface DTSProperty {
  name: string
  type: string
  description: string
  required: boolean
  default: string | number | boolean | null
  enum: string[] | number[] | null
  const: string | number | null
}

export interface Binding {
  compatible: string
  title: string
  description: string
  category: string
  vendor: string
  soc_family: string[]
  bus: string
  on_bus: string
  properties: DTSProperty[]
  includes: string[]
  child_binding: boolean
  source_file: string
  prop_count?: number
}

export interface Board {
  name: string
  full_name: string
  soc: string
  arch: string
  vendor: string
  supported_features: string[]
  yaml_path: string
}

export interface SearchResult extends Partial<Binding> {
  compatible: string
  title: string
  category: string
  vendor: string
}

export interface GenerateRequest {
  peripheral: string
  soc: string
  board: string
}

export interface GenerateResult {
  peripheral: string
  soc: string
  board: string
  binding_used: string
  node_name: string
  overlay: string
  needs_pinctrl: boolean
  kconfig: string[]
  cmake: string[]
  explanation: string
  properties: DTSProperty[]
}

export interface ValidationIssue {
  level: 'error' | 'warning' | 'ok' | 'hint'
  message: string
  line: number | null
}

export interface ValidateRequest {
  dts_content: string
  peripheral?: string
  soc?: string
}

export interface ValidateResult {
  valid: boolean
  error_count: number
  warning_count: number
  issues: ValidationIssue[]
  summary: string
}
