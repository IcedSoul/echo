import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../lib/api-client'
import type { SessionListResponse } from '../types'
import { formatDate } from '../lib/utils'
import { Filter } from 'lucide-react'

export default function SessionsPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', page, typeFilter],
    queryFn: async () => {
      const response = await apiClient.get<SessionListResponse>('/admin/sessions', {
        params: {
          page,
          page_size: 20,
          type: typeFilter || undefined,
        },
      })
      return response.data
    },
  })

  const typeLabels: Record<string, string> = {
    conflict: '冲突复盘',
    situation_judge: '情况评理',
    expression_helper: '表达助手',
    ai_chat: 'AI对话',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">记录管理</h1>
        <div className="flex items-center gap-2">
          <Filter size={20} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部类型</option>
            <option value="conflict">冲突复盘</option>
            <option value="situation_judge">情况评理</option>
            <option value="expression_helper">表达助手</option>
            <option value="ai_chat">AI对话</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">会话ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">风险等级</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((session) => (
                  <tr key={session.session_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-xs font-mono text-gray-600 cursor-help"
                        title={session.session_id}
                      >
                        {session.session_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm">{session.user_nickname || '未命名'}</div>
                        <span
                          className="text-xs text-gray-500 font-mono cursor-help"
                          title={session.user_id}
                        >
                          {session.user_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {typeLabels[session.type] || session.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {session.risk_level ? (
                        <span className={`px-2 py-1 rounded text-xs ${
                          session.risk_level === 'HIGH' || session.risk_level === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : session.risk_level === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {session.risk_level}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(session.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center p-4 border-t">
              <div className="text-sm text-gray-600">
                共 {data?.total || 0} 条记录
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-3 py-1">{page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!data || data.items.length < 20}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


