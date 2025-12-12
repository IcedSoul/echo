import { useQuery } from '@tanstack/react-query'
import apiClient from '../lib/api-client'
import type { OverviewStats } from '../types'
import { Users, FileText, TrendingUp, Activity, MessageSquare, Shield } from 'lucide-react'

export default function OverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['overview-stats'],
    queryFn: async () => {
      const response = await apiClient.get<OverviewStats>('/admin/overview')
      return response.data
    },
    refetchInterval: 30000, // 30秒自动刷新
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-500">加载中...</p>
      </div>
    )
  }

  const statCards = [
    {
      title: '总用户数',
      value: stats?.total_users || 0,
      sub: `今日新增 ${stats?.new_users_today || 0}`,
      icon: Users,
      bgColor: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: '总会话数',
      value: stats?.total_sessions || 0,
      sub: `今日新增 ${stats?.sessions_today || 0}`,
      icon: FileText,
      bgColor: 'bg-green-500',
      lightBg: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: '冲突复盘',
      value: stats?.conflict_analysis_count || 0,
      sub: '累计使用次数',
      icon: Shield,
      bgColor: 'bg-purple-500',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'AI对话',
      value: stats?.ai_chat_count || 0,
      sub: '累计对话次数',
      icon: MessageSquare,
      bgColor: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">数据概览</h1>
        <p className="text-gray-500 mt-1">实时查看系统运行数据</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${card.lightBg} rounded-lg`}>
                  <Icon className={card.textColor} size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">{card.sub}</div>
            </div>
          )
        })}
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 功能使用统计 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            功能使用统计
          </h2>
          <div className="space-y-4">
            <StatBar
              label="冲突复盘"
              value={stats?.conflict_analysis_count || 0}
              total={stats?.total_sessions || 1}
              color="bg-blue-500"
            />
            <StatBar
              label="情况评理"
              value={stats?.situation_judge_count || 0}
              total={stats?.total_sessions || 1}
              color="bg-green-500"
            />
            <StatBar
              label="表达助手"
              value={stats?.expression_helper_count || 0}
              total={stats?.total_sessions || 1}
              color="bg-purple-500"
            />
            <StatBar
              label="AI对话"
              value={stats?.ai_chat_count || 0}
              total={stats?.total_sessions || 1}
              color="bg-orange-500"
            />
          </div>
        </div>

        {/* 用户增长趋势 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={20} />
            增长趋势
          </h2>
          <div className="space-y-4">
            <TrendItem
              label="本周新增用户"
              value={stats?.new_users_week || 0}
              icon={Users}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <TrendItem
              label="今日新增用户"
              value={stats?.new_users_today || 0}
              icon={Users}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <TrendItem
              label="本周会话数"
              value={stats?.sessions_week || 0}
              icon={FileText}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <TrendItem
              label="今日会话数"
              value={stats?.sessions_today || 0}
              icon={FileText}
              color="text-green-600"
              bgColor="bg-green-50"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const percentage = Math.min((value / total) * 100, 100)

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-900 font-semibold">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {percentage.toFixed(1)}% of total
      </div>
    </div>
  )
}

function TrendItem({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string
  value: number
  icon: any
  color: string
  bgColor: string
}) {
  return (
    <div className={`flex justify-between items-center p-4 ${bgColor} rounded-lg`}>
      <div className="flex items-center gap-3">
        <Icon className={color} size={20} />
        <span className="text-gray-700 font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</span>
    </div>
  )
}
