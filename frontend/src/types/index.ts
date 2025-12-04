/**
 * 全局类型定义
 */

// ============ 用户相关 ============

export interface User {
  userId: string;
  email?: string;
  phone?: string;
  nickname?: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  is_new_user: boolean;
  // 用户完整信息
  nickname?: string;
  email?: string;
  phone?: string;
}

export interface SendCodeResponse {
  message: string;
  account: string;
  account_type: 'phone' | 'email';
  expires_in_minutes: number;
}

export interface UpdateUserRequest {
  nickname?: string;
}

// ============ 分析相关 ============

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnalysisStatus = 'processing' | 'completed' | 'failed';

export interface TimelineStep {
  step: number;
  description: string;
  emotion: string;
  speaker: '我' | '对方';
}

export interface EmotionDetail {
  primary: string;
  secondary: string[];
  explanation: string;
}

export interface EmotionAnalysis {
  my_emotions: EmotionDetail;
  their_emotions: EmotionDetail;
}

export interface NeedsAnalysis {
  my_needs: string[];
  their_needs: string[];
  conflict_core: string;
}

export interface AdviceItem {
  type: 'gentle' | 'explanatory' | 'humorous' | 'fallback';
  title: string;
  message: string;
  explanation: string;
}

export interface AnalysisResult {
  summary: string;
  timeline: TimelineStep[];
  emotion_analysis: EmotionAnalysis;
  needs_analysis: NeedsAnalysis;
  advice: AdviceItem[];
  risk_hints?: string[];
}

export interface AnalyzeConflictRequest {
  conversation_text: string;
  context_description?: string;
  user_id: string;
}

export interface AnalyzeConflictResponse {
  session_id: string;
  status: AnalysisStatus;
  risk_level: RiskLevel;
  analysis_result?: AnalysisResult;
  created_at: string;
  completed_at?: string;
}

// ============ 用户统计 ============

export interface UserStats {
  total_analyses: number;
  healthy_conversations: number;
  needs_attention: number;
}

// ============ 历史记录 ============

export interface HistoryItem {
  sessionId: string;
  riskLevel: RiskLevel;
  summary: string;
  createdAt: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

// ============ 导航相关 ============

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  AnalyzeInput: undefined;
  Loading: {
    conversationText: string;
    contextDescription?: string;
    userId: string;
  };
  Result: { sessionId: string; riskLevel: RiskLevel; result: AnalysisResult };
  History: undefined;
  Profile: undefined;
  NotificationSettings: undefined;
  PrivacyPolicy: undefined;
  HelpFeedback: undefined;
};
