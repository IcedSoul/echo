export interface User {
  user_id: string
  nickname?: string
  email?: string
  phone?: string
  role: 'user' | 'admin'
  is_anonymous: boolean
  created_at: string
  last_login_at?: string
}

export interface OverviewStats {
  total_users: number
  new_users_today: number
  new_users_week: number
  total_sessions: number
  sessions_today: number
  sessions_week: number
  conflict_analysis_count: number
  situation_judge_count: number
  expression_helper_count: number
  ai_chat_count: number
}

export interface UserListResponse {
  items: User[]
  total: number
  page: number
  page_size: number
}

export interface SessionItem {
  session_id: string
  user_id: string
  user_nickname?: string
  type: 'conflict' | 'situation_judge' | 'expression_helper' | 'ai_chat'
  status: string
  risk_level?: string
  created_at: string
  completed_at?: string
}

export interface SessionListResponse {
  items: SessionItem[]
  total: number
  page: number
  page_size: number
}

export interface UsageLimit {
  user_id: string
  user_nickname?: string
  user_level: string
  limits: {
    conflict_analysis_limit: number
    situation_judge_limit: number
    expression_helper_limit: number
    ai_chat_limit: number
  }
  usage: {
    conflict_analysis_used: number
    situation_judge_used: number
    expression_helper_used: number
    ai_chat_used: number
  }
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  account: string
  code: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: string
  nickname?: string
  email?: string
  phone?: string
  role: 'user' | 'admin'
}


