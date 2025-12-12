import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../lib/api-client'
import type { LoginResponse } from '../types'
import { Mail, Phone, Lock, Send } from 'lucide-react'

export default function LoginPage() {
  const [account, setAccount] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient.post<LoginResponse>('/auth/verify-code', {
        account,
        code,
      })

      const { access_token, role } = response.data

      if (role !== 'admin') {
        setError('需要管理员权限才能登录')
        setLoading(false)
        return
      }

      localStorage.setItem('admin_token', access_token)

      // 延迟跳转以确保状态更新
      setTimeout(() => {
        navigate('/', { replace: true })
        window.location.reload() // 强制刷新以更新认证状态
      }, 100)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '登录失败，请重试')
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!account) {
      setError('请输入邮箱或手机号')
      return
    }

    setSendingCode(true)
    setError('')

    try {
      await apiClient.post('/auth/send-code', { account })
      setCodeSent(true)
      setCountdown(60)

      // 倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '发送验证码失败')
    } finally {
      setSendingCode(false)
    }
  }

  const isPhone = /^1[3-9]\d{9}$/.test(account)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">W</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Wavecho Admin
          </h1>
          <p className="text-gray-600 mt-2">管理后台登录</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Account Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱或手机号
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {isEmail ? <Mail size={20} /> : <Phone size={20} />}
                </div>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="输入邮箱或手机号"
                  required
                />
              </div>
            </div>

            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                验证码
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={20} />
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="输入6位验证码"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0 || (!isEmail && !isPhone)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium whitespace-nowrap flex items-center gap-2"
                >
                  {sendingCode ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      发送中
                    </>
                  ) : countdown > 0 ? (
                    `${countdown}秒`
                  ) : (
                    <>
                      <Send size={16} />
                      {codeSent ? '重新发送' : '获取验证码'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {codeSent && !error && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                验证码已发送，请查收
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>请使用管理员账号登录</p>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-8 text-sm text-gray-500">
          © 2024 Wavecho. All rights reserved.
        </div>
      </div>
    </div>
  )
}
