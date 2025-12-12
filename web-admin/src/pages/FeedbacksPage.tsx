import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../lib/api-client'
import type { FeedbackListResponse, Feedback } from '../types'
import { formatDate } from '../lib/utils'
import { MessageSquare, Filter, Eye, CheckCircle, MessageCircle } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function FeedbacksPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['feedbacks', page, statusFilter],
    queryFn: async () => {
      const response = await apiClient.get<FeedbackListResponse>('/feedback/list', {
        params: {
          page,
          page_size: 20,
          status_filter: statusFilter || undefined
        },
      })
      return response.data
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ feedbackId, status }: { feedbackId: string; status: string }) => {
      await apiClient.put(`/feedback/${feedbackId}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      toast.success('状态更新成功', '反馈状态已更新')
    },
    onError: (error: any) => {
      toast.error('更新失败', error.response?.data?.error?.message || '更新状态失败')
    },
  })

  const handleStatusChange = (feedbackId: string, newStatus: string) => {
    updateStatus.mutate({ feedbackId, status: newStatus })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
      read: { label: '已读', color: 'bg-blue-100 text-blue-800' },
      replied: { label: '已回复', color: 'bg-green-100 text-green-800' },
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户反馈</h1>
          <p className="text-gray-500 mt-1">查看和管理用户反馈</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex gap-4 items-center">
          <Filter className="text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="read">已读</option>
            <option value="replied">已回复</option>
          </select>
        </div>
      </div>

      {/* 反馈列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        ) : !data?.feedbacks || data.feedbacks.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">暂无反馈数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    反馈内容
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    联系方式
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    提交时间
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.feedbacks.map((feedback) => (
                  <tr key={feedback.feedback_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="text-xs font-mono text-gray-600 cursor-help"
                        title={feedback.user_id}
                      >
                        {feedback.user_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        <p className="line-clamp-2">{feedback.content}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {feedback.contact || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(feedback.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatDate(feedback.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {feedback.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(feedback.feedback_id, 'read')}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="标记为已读"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {(feedback.status === 'pending' || feedback.status === 'read') && (
                          <button
                            onClick={() => handleStatusChange(feedback.feedback_id, 'replied')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="标记为已回复"
                          >
                            <MessageCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {data && data.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {data.total} 条反馈，第 {page} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data || page * 20 >= data.total}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
