import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).substring(7)
      const toast: Toast = { id, type, title, message }

      setToasts((prev) => [...prev, toast])

      // 自动移除
      setTimeout(() => {
        removeToast(id)
      }, 5000)
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, message?: string) => showToast('success', title, message),
    [showToast]
  )

  const error = useCallback(
    (title: string, message?: string) => showToast('error', title, message),
    [showToast]
  )

  const warning = useCallback(
    (title: string, message?: string) => showToast('warning', title, message),
    [showToast]
  )

  const info = useCallback(
    (title: string, message?: string) => showToast('info', title, message),
    [showToast]
  )

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />
      case 'error':
        return <XCircle className="text-red-500" size={20} />
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={20} />
      case 'info':
        return <Info className="text-blue-500" size={20} />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast 容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-in-out animate-slide-in-right ${getStyles(
              toast.type
            )} border rounded-lg shadow-lg p-4 min-w-[320px] max-w-md`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm text-gray-600 mt-1">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
