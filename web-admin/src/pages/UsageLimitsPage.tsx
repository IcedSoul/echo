import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../lib/api-client'
import type { UsageLimit } from '../types'
import { formatDate } from '../lib/utils'
import { RefreshCw, Edit } from 'lucide-react'
import EditLimitDialog, { LimitFormData } from '../components/EditLimitDialog'
import { useToast } from '../components/Toast'

export default function UsageLimitsPage() {
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLimit, setEditingLimit] = useState<UsageLimit | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: limits, isLoading } = useQuery({
    queryKey: ['usage-limits', page],
    queryFn: async () => {
      const response = await apiClient.get<UsageLimit[]>('/admin/usage-limits', {
        params: { page, page_size: 20 },
      })
      return response.data
    },
  })

  const resetUsage = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(`/admin/usage-limits/${userId}/reset`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-limits'] })
      toast.success('重置成功', '使用次数已重置')
    },
    onError: (error: any) => {
      toast.error('重置失败', error.response?.data?.error?.message || '重置使用次数失败')
    },
  })

  const updateLimit = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: LimitFormData }) => {
      await apiClient.put(`/admin/usage-limits/${userId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-limits'] })
      toast.success('更新成功', '限额已更新')
      setDialogOpen(false)
      setEditingLimit(null)
    },
    onError: (error: any) => {
      toast.error('更新失败', error.response?.data?.error?.message || '更新限额失败')
    },
  })

  const handleReset = (userId: string) => {
    if (confirm('确定要重置该用户的使用次数吗？')) {
      resetUsage.mutate(userId)
    }
  }

  const handleEdit = (limit: UsageLimit) => {
    setEditingLimit(limit)
    setDialogOpen(true)
  }

  const handleSubmitLimit = (data: LimitFormData) => {
    if (editingLimit) {
      updateLimit.mutate({ userId: editingLimit.user_id, data })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">限额管理</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">等级</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">冲突复盘</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">情况评理</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">表达助手</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">AI对话</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">更新时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {limits?.map((limit) => (
                  <tr key={limit.user_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{limit.user_nickname || '未命名'}</div>
                        <span
                          className="text-xs text-gray-500 font-mono cursor-help"
                          title={limit.user_id}
                        >
                          {limit.user_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{limit.user_level}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <UsageCell
                        used={limit.usage.conflict_analysis_used}
                        limit={limit.limits.conflict_analysis_limit}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <UsageCell
                        used={limit.usage.situation_judge_used}
                        limit={limit.limits.situation_judge_limit}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <UsageCell
                        used={limit.usage.expression_helper_used}
                        limit={limit.limits.expression_helper_limit}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <UsageCell
                        used={limit.usage.ai_chat_used}
                        limit={limit.limits.ai_chat_limit}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(limit.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReset(limit.user_id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="重置使用次数"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(limit)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="编辑限额"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center p-4 border-t">
          <div className="text-sm text-gray-600">
            第 {page} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!limits || limits.length < 20}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 编辑限额对话框 */}
      <EditLimitDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingLimit(null)
        }}
        onSubmit={handleSubmitLimit}
        initialData={
          editingLimit
            ? {
                conflict_analysis_limit: editingLimit.limits.conflict_analysis_limit,
                situation_judge_limit: editingLimit.limits.situation_judge_limit,
                expression_helper_limit: editingLimit.limits.expression_helper_limit,
                ai_chat_limit: editingLimit.limits.ai_chat_limit,
              }
            : undefined
        }
        userNickname={editingLimit?.user_nickname}
        loading={updateLimit.isPending}
      />
    </div>
  )
}

function UsageCell({ used, limit }: { used: number; limit: number }) {
  const percentage = (used / limit) * 100
  const isWarning = percentage >= 80
  const isDanger = percentage >= 100

  return (
    <div className="space-y-1">
      <div className={`text-sm font-medium ${
        isDanger ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-900'
      }`}>
        {used} / {limit}
      </div>
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden w-20 mx-auto">
        <div
          className={`h-full ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  )
}


