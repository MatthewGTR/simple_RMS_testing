import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Eye, EyeOff, Briefcase, Users, Shield, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

type UserType = 'agent' | 'consumer' | null;

interface EnhancedAuthProps {
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function EnhancedAuth({ onClose, initialMode = 'signin' }: EnhancedAuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userType, setUserType] = useState<UserType>(null);
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('Malaysia');
  const [phone, setPhone] = useState('');
  const [renNumber, setRenNumber] = useState('');
  const [agencyName, setAgencyName] = useState('');

  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        if (!userType) {
          setMessage('Please select account type');
          setLoading(false);
          return;
        }

        if (!fullName || !phone) {
          setMessage('Please fill in all required fields');
          setLoading(false);
          return;
        }

        if (userType === 'agent' && !renNumber) {
          setMessage('REN number is required for agents');
          setLoading(false);
          return;
        }

        const { data: authData, error: signUpError } = await signUp(email, password);

        if (signUpError) {
          setMessage(signUpError.message);
          setLoading(false);
          return;
        }

        if (authData?.user) {
          const profileData: any = {
            email,
            full_name: fullName,
            user_type: userType,
            country,
            phone,
          };

          if (userType === 'agent') {
            profileData.ren_number = renNumber;
            profileData.agency_name = agencyName || null;
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', authData.user.id);

          if (updateError) {
            console.error('Profile update error:', updateError);
            setMessage('Account created but profile update failed');
            setLoading(false);
            return;
          }
        }

        setMessage('Account created successfully! Please sign in.');
        setTimeout(() => {
          setMode('signin');
          setMessage('');
          setUserType(null);
        }, 2000);
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setMessage(error.message);
        }
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
              {mode === 'signup' ? (
                <UserPlus className="w-10 h-10 text-white" />
              ) : (
                <LogIn className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              {mode === 'signup' ? 'Join Property AI today' : 'Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && !userType && (
              <div className="space-y-4">
                <label className="block text-base font-semibold text-gray-900 mb-4">
                  Select Account Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setUserType('agent')}
                    className="group p-8 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-center"
                  >
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Agent</h3>
                    <p className="text-sm text-gray-600">List and sell properties</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('consumer')}
                    className="group p-8 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-center"
                  >
                    <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Consumer</h3>
                    <p className="text-sm text-gray-600">Buy or rent properties</p>
                  </button>
                </div>
              </div>
            )}

            {(mode === 'signin' || userType) && (
              <>
                {mode === 'signup' && userType && (
                  <button
                    type="button"
                    onClick={() => setUserType(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Change account type
                  </button>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && userType && (
                  <>
                    <div className="border-t-2 border-gray-100 pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="John Doe"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Country *
                            </label>
                            <input
                              type="text"
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Phone *
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="+60123456789"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {userType === 'agent' && (
                      <div className="border-t-2 border-gray-100 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Agent Information</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              REN Number *
                            </label>
                            <input
                              type="text"
                              value={renNumber}
                              onChange={(e) => setRenNumber(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="REN12345"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Agency Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={agencyName}
                              onChange={(e) => setAgencyName(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Your agency name"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {message && (
              <div
                className={`p-4 rounded-xl font-medium ${
                  message.includes('success')
                    ? 'bg-green-50 text-green-700 border-2 border-green-200'
                    : 'bg-red-50 text-red-700 border-2 border-red-200'
                }`}
              >
                {message}
              </div>
            )}

            {(mode === 'signin' || userType) && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setMessage('');
                  setUserType(null);
                }}
                className="ml-2 text-blue-600 hover:text-blue-700 font-bold"
              >
                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {mode === 'signin' && (
            <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">Test Accounts:</p>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Admin:</span> admin@test.com / password
                </p>
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">User:</span> user@test.com / password
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
