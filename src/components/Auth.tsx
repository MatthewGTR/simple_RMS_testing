import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, UserPlus, Eye, EyeOff, Briefcase, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

type UserType = 'agent' | 'consumer' | null

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // User type and common fields
  const [userType, setUserType] = useState<UserType>(null)
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')

  // Agent-specific fields
  const [renNumber, setRenNumber] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [agencyLicense, setAgencyLicense] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')

  // Consumer-specific fields
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [occupation, setOccupation] = useState('')
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone' | 'whatsapp'>('email')

  const { signUp, signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Client-side password validation
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    // Sign-up validations
    if (isSignUp) {
      if (!userType) {
        setMessage('Please select a user type (Agent or Consumer)')
        setLoading(false)
        return
      }
      if (!fullName || !country || !phone) {
        setMessage('Please fill in all required fields')
        setLoading(false)
        return
      }
      if (userType === 'agent' && !renNumber) {
        setMessage('REN number is required for agents')
        setLoading(false)
        return
      }
    }

    try {
      if (isSignUp) {
        // Sign up
        const { data: authData, error: signUpError } = await signUp(email, password)

        if (signUpError) {
          setMessage(signUpError.message)
          setLoading(false)
          return
        }

        // Update profile with additional information
        if (authData?.user) {
          const profileData: any = {
            email,
            full_name: fullName,
            user_type: userType,
            country,
            phone,
          }

          // Add agent-specific fields
          if (userType === 'agent') {
            profileData.ren_number = renNumber
            profileData.agency_name = agencyName || null
            profileData.agency_license = agencyLicense || null
            profileData.years_experience = yearsExperience ? parseInt(yearsExperience) : null
          }

          // Add consumer-specific fields
          if (userType === 'consumer') {
            profileData.date_of_birth = dateOfBirth || null
            profileData.occupation = occupation || null
            profileData.preferred_contact_method = preferredContact
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', authData.user.id)

          if (updateError) {
            console.error('Profile update error:', updateError)
            setMessage('Account created but profile update failed. Please contact support.')
            setLoading(false)
            return
          }
        }

        setMessage('Account created successfully! Please sign in.')
        setIsSignUp(false)
        // Reset form
        setUserType(null)
        setFullName('')
        setCountry('')
        setPhone('')
        setRenNumber('')
        setAgencyName('')
        setAgencyLicense('')
        setYearsExperience('')
        setDateOfBirth('')
        setOccupation('')
        setPreferredContact('email')
      } else {
        // Sign in
        const { error } = await signIn(email, password)
        if (error) {
          setMessage(error.message)
        }
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            {isSignUp ? <UserPlus className="w-8 h-8 text-blue-600" /> : <LogIn className="w-8 h-8 text-blue-600" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSignUp ? 'Join our platform today' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Type Selection (Sign Up Only) */}
          {isSignUp && !userType && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUserType('agent')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-center group"
                >
                  <Briefcase className="w-10 h-10 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Real Estate Agent</h3>
                  <p className="text-sm text-gray-500 mt-1">Property professional</p>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('consumer')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-center group"
                >
                  <Users className="w-10 h-10 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Consumer</h3>
                  <p className="text-sm text-gray-500 mt-1">Property buyer/seller</p>
                </button>
              </div>
            </div>
          )}

          {/* Show form fields after user type is selected or for sign in */}
          {(!isSignUp || userType) && (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Additional fields for sign up */}
              {isSignUp && userType && (
                <>
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                            Country *
                          </label>
                          <input
                            type="text"
                            id="country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Malaysia"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+60123456789"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent-specific fields */}
                  {userType === 'agent' && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="renNumber" className="block text-sm font-medium text-gray-700 mb-2">
                            REN Number *
                          </label>
                          <input
                            type="text"
                            id="renNumber"
                            value={renNumber}
                            onChange={(e) => setRenNumber(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your REN number"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700 mb-2">
                            Agency Name
                          </label>
                          <input
                            type="text"
                            id="agencyName"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your agency name"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="agencyLicense" className="block text-sm font-medium text-gray-700 mb-2">
                              Agency License
                            </label>
                            <input
                              type="text"
                              id="agencyLicense"
                              value={agencyLicense}
                              onChange={(e) => setAgencyLicense(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="License number"
                            />
                          </div>

                          <div>
                            <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-2">
                              Years of Experience
                            </label>
                            <input
                              type="number"
                              id="yearsExperience"
                              value={yearsExperience}
                              onChange={(e) => setYearsExperience(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Years"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consumer-specific fields */}
                  {userType === 'consumer' && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Consumer Information</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              id="dateOfBirth"
                              value={dateOfBirth}
                              onChange={(e) => setDateOfBirth(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-2">
                              Occupation
                            </label>
                            <input
                              type="text"
                              id="occupation"
                              value={occupation}
                              onChange={(e) => setOccupation(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Your occupation"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="preferredContact" className="block text-sm font-medium text-gray-700 mb-2">
                            Preferred Contact Method
                          </label>
                          <select
                            id="preferredContact"
                            value={preferredContact}
                            onChange={(e) => setPreferredContact(e.target.value as 'email' | 'phone' | 'whatsapp')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="whatsapp">WhatsApp</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('successfully')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Show submit button only if user type is selected (for sign up) or it's sign in */}
          {(!isSignUp || userType) && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage('')
                setUserType(null)
              }}
              className="ml-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {!isSignUp && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">Test Accounts:</p>
            <p className="text-xs text-gray-500">Admin: admin@test.com / password</p>
            <p className="text-xs text-gray-500">User: user@test.com / password</p>
          </div>
        )}
      </div>
    </div>
  )
}