import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { User } from '../types'

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  onSubmit: (data: UserFormData) => Promise<void>
}

export interface UserFormData {
  nickname: string
  email?: string
  phone?: string
  role: 'user' | 'admin'
}

export default function UserDialog({ open, onOpenChange, user, onSubmit }: UserDialogProps) {
  const [formData, setFormData] = useState<UserFormData>({
    nickname: '',
    email: '',
    phone: '',
    role: 'user',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        nickname: user.nickname || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
      })
    } else {
      setFormData({
        nickname: '',
        email: '',
        phone: '',
        role: 'user',
      })
    }
    setError('')
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证：至少要有邮箱或手机号（新建用户时）
    if (!user && !formData.email && !formData.phone) {
      setError('请至少填写邮箱或手机号')
      return
    }

    if (!formData.nickname.trim()) {
      setError('请填写昵称')
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
          <Dialog.Title className="text-xl font-bold mb-4">
            {user ? '编辑用户' : '新建用户'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                昵称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入昵称"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                邮箱 {!user && <span className="text-gray-500 text-xs">(至少填写邮箱或手机号之一)</span>}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入邮箱"
                disabled={!!user}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                手机号 {!user && <span className="text-gray-500 text-xs">(至少填写邮箱或手机号之一)</span>}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入手机号"
                disabled={!!user}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">角色</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  取消
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '提交中...' : '确定'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
