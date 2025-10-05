import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, CreditCard, Calendar, ShoppingCart } from 'lucide-react'
import { PingSupabase } from './PingSupabase'
import { supabase } from '../lib/supabase'

export function Dashboard() {
  const { profile } = useAuth()
  const [useAmount, setUseAmount] = useState('')
  const [useReason, setUseReason] = useState('')
  const [using, setUsing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleUseCredits = async () => {
    if (!useAmount || parseInt(useAmount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      setUsing(true)
      setError('')
      setMessage('')

      const amount = parseInt(useAmount)
      const reason = useReason || 'Credit usage'

      const { data, error: rpcError } = await supabase.rpc('use_credits', {
        p_amount: amount,
        p_reason: reason
      })

      if (rpcError) throw rpcError

      // Send email notification
      try {
        const oldCredits = (data as any)?.old_credits || 0
        const newCredits = (data as any)?.new_credits || 0

        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: profile.email,
            subject: 'Credits Used - Transaction Confirmation',
            html: `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #059669;">Transaction Confirmed</h2>
                <p>Hello,</p>
                <p>You have successfully used <strong>${amount} credits</strong>.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Amount Used:</strong> ${amount} credits</p>
                  <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
                  <p style="margin: 5px 0;"><strong>Previous Balance:</strong> ${oldCredits} credits</p>
                  <p style="margin: 5px 0;"><strong>New Balance:</strong> ${newCredits} credits</p>
                </div>
                <p style="margin-top: 30px; font-size: 0.9em; color: #666;">Thank you for using CreditApp!</p>
              </div></body></html>`
          })
        })
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
      }

      setMessage(`Successfully used ${useAmount} credits. Email notification sent!`)
      setUseAmount('')
      setUseReason('')

      // Refresh the page to update credits
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUsing(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your account overview.</p>
        <div className="mt-4">
          <PingSupabase />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Credits</p>
              <p className="text-2xl font-bold text-gray-900">{profile.credits?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profile</p>
              <p className="text-2xl font-bold text-gray-900">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Member Since</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900 mt-1">{profile.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Current Balance</label>
              <p className="text-gray-900 mt-1">{profile.credits || 0} credits</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <ShoppingCart className="w-5 h-5 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Use Credits</h2>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
            <strong>📧 Email Notifications:</strong> You'll receive an email confirmation after using credits.
            To receive actual emails, ask your admin to configure RESEND_API_KEY.
          </div>

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                min="1"
                max={profile.credits || 0}
                value={useAmount}
                onChange={(e) => setUseAmount(e.target.value)}
                disabled={using}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Enter amount to use"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={useReason}
                onChange={(e) => setUseReason(e.target.value)}
                disabled={using}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="e.g., Purchase, Service fee"
              />
            </div>

            <button
              onClick={handleUseCredits}
              disabled={using || !useAmount || parseInt(useAmount) <= 0 || parseInt(useAmount) > (profile.credits || 0)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {using ? 'Processing...' : 'Use Credits'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              You will receive an email confirmation after using credits
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}