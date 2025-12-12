/**
 * 全局类型定义
 */

// ============ 用户相关 ============

export interface User {
  userId: string;
  email?: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
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
  avatar?: string;
}

export interface SendCodeResponse {
  message: string;
  account: string;
  account_type: 'phone' | 'email';
  expires_in_minutes: number;
}

export interface UpdateUserRequest {
  nickname?: string;
  avatar?: string;
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

export type HistoryType = 'conflict' | 'situation' | 'expression';

export interface HistoryItem {
  sessionId: string;
  type: HistoryType;
  riskLevel?: RiskLevel;
  summary: string;
  createdAt: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

// ============ 情况评理相关 ============

export interface SituationJudgeRequest {
  situation_text: string;
  background_description?: string;
  user_id: string;
}

export interface LogicIssue {
  type: string;
  description: string;
}

export interface SuggestionItem {
  style: string;
  text: string;
}

export interface SituationJudgeResult {
  summary: string;
  perspectives: {
    yours: string;
    theirs: string;
  };
  responsibility: {
    yours: number;
    theirs: number;
    shared: number;
  };
  logic_issues: LogicIssue[];
  suggestions: SuggestionItem[];
}

export interface SituationJudgeResponse {
  session_id: string;
  status: AnalysisStatus;
  analysis_result?: SituationJudgeResult;
  created_at: string;
  completed_at?: string;
}

// ============ 表达助手相关 ============

export type ExpressionIntent = 'reconcile' | 'boundary' | 'understand' | 'stance';

export interface ExpressionHelperRequest {
  original_message: string;
  intent: ExpressionIntent;
  user_id: string;
}

export interface ExpressionItem {
  style: string;
  text: string;
}

export type ExpressionResult = ExpressionItem[];

export interface ExpressionHelperResponse {
  session_id: string;
  status: AnalysisStatus;
  expressions?: ExpressionResult;
  created_at: string;
  completed_at?: string;
}

// ============ 导航相关 ============

export type RootStackParamList = {
  // 主页
  Home: undefined;
  
  // 认证
  Welcome: undefined;
  Auth: undefined;
  
  // 冲突复盘
  AnalyzeInput: undefined;
  Loading: {
    conversationText: string;
    contextDescription?: string;
    userId: string;
  };
  Result: { 
    sessionId: string; 
    riskLevel: RiskLevel; 
    result: AnalysisResult;
    originalInput?: {
      conversationText: string;
      contextDescription?: string;
      userId: string;
    };
  };
  
  // 情况评理
  SituationJudgeInput: undefined;
  SituationJudgeLoading: {
    situation: string;
    background?: string;
    userId: string;
  };
  SituationJudgeResult: {
    sessionId: string;
    result: SituationJudgeResult;
    originalInput?: {
      situation: string;
      background?: string;
      userId: string;
    };
  };
  
  // 表达助手
  ExpressionHelperInput: undefined;
  ExpressionHelperLoading: {
    message: string;
    intent: ExpressionIntent;
    userId: string;
  };
  ExpressionHelperResult: {
    sessionId: string;
    result: ExpressionResult;
    originalInput?: {
      message: string;
      intent: ExpressionIntent;
      userId: string;
    };
  };
  
  // AI 聊天
  AIChat: { sessionId?: string };
  ChatHistory: undefined;
  
  // 其他
  History: { type: HistoryType };
  Profile: undefined;
  NotificationSettings: undefined;
  PrivacyPolicy: undefined;
  HelpFeedback: undefined;
};
