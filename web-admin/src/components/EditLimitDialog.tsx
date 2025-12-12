import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export interface LimitFormData {
  conflict_analysis_limit: number
  situation_judge_limit: number
  expression_helper_limit: number
  ai_chat_limit: number
}

interface EditLimitDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: LimitFormData) => void
  initialData?: LimitFormData
  userNickname?: string
  loading?: boolean
}

export default function EditLimitDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  userNickname,
  loading = false,
}: EditLimitDialogProps) {
  const [formData, setFormData] = useState<LimitFormData>({
    conflict_analysis_limit: 10,
    situation_judge_limit: 10,
    expression_helper_limit: 10,
    ai_chat_limit: 20,
  })

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: keyof LimitFormData, value: string) => {
    const numValue = parseInt(value) || 0
    setFormData((prev) => ({
      ...prev,
      [field]: Math.max(0, numValue),
    }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">编辑限额</h2>
            {userNickname && (
              <p className="text-sm text-gray-500 mt-1">用户: {userNickname}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 冲突复盘 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              冲突复盘限额
            </label>
            <input
              type="number"
              min="0"
              value={formData.conflict_analysis_limit}
              onChange={(e) => handleChange('conflict_analysis_limit', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 情况评理 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              情况评理限额
            </label>
            <input
              type="number"
              min="0"
              value={formData.situation_judge_limit}
              onChange={(e) => handleChange('situation_judge_limit', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 表达助手 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表达助手限额
            </label>
            <input
              type="number"
              min="0"
              value={formData.expression_helper_limit}
              onChange={(e) => handleChange('expression_helper_limit', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* AI对话 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI对话限额
            </label>
            <input
              type="number"
              min="0"
              value={formData.ai_chat_limit}
              onChange={(e) => handleChange('ai_chat_limit', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
