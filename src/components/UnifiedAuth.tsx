import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, ArrowLeft, Eye, EyeOff, Shield, Briefcase, Home as HomeIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UnifiedAuthProps {
  onClose: () => void;
  initialMode?: 'signin' | 'role-selection';
}

type UserRole = 'admin' | 'agent' | 'consumer' | null;

export function UnifiedAuth({ onClose, initialMode = 'signin' }: UnifiedAuthProps) {
  const [mode, setMode] = useState<'signin' | 'role-selection' | 'register-admin' | 'register-agent' | 'register-consumer'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Malaysia');

  const [adminCode, setAdminCode] = useState('');
  const [renNumber, setRenNumber] = useState('');
  const [agencyName, setAgencyName] = useState('');

  const { signUp, signIn } = useAuth();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setCountry('Malaysia');
    setAdminCode('');
    setRenNumber('');
    setAgencyName('');
    setShowPassword(false);
    setMessage('');
  };

  const handleRoleSelection = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'admin') {
      setMode('register-admin');
    } else if (role === 'agent') {
      setMode('register-agent');
    } else if (role === 'consumer') {
      setMode('register-consumer');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setMessage(error.message);
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!fullName || !phone) {
      setMessage('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (mode === 'register-admin' && adminCode !== 'PROPERTYAI2025') {
      setMessage('Invalid admin code');
      setLoading(false);
      return;
    }

    if (mode === 'register-agent' && !renNumber) {
      setMessage('REN number is required for agents');
      setLoading(false);
      return;
    }

    try {
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
          country,
          phone,
        };

        if (mode === 'register-admin') {
          profileData.role = 'admin';
        } else if (mode === 'register-agent') {
          profileData.user_type = 'agent';
          profileData.ren_number = renNumber;
          profileData.agency_name = agencyName || null;
          profileData.listing_credits = 50;
          profileData.boosting_credits = 10;
        } else if (mode === 'register-consumer') {
          profileData.user_type = 'consumer';
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

      setMessage('Account created successfully! Signing you in...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderSignIn = () => (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-600 mt-2 text-lg">Sign in to your account</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-6">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?
          <button
            onClick={() => {
              resetForm();
              setMode('role-selection');
            }}
            className="ml-2 text-blue-600 hover:text-blue-700 font-bold"
          >
            Register
          </button>
        </p>
      </div>

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
    </div>
  );

  const renderRoleSelection = () => (
    <div className="p-8">
      <button
        onClick={() => {
          resetForm();
          setMode('signin');
        }}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Account Type</h1>
        <p className="text-gray-600 text-lg">Select the type of account you want to create</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleRoleSelection('consumer')}
          className="w-full group p-8 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left"
        >
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <HomeIcon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Consumer</h3>
              <p className="text-gray-600">Buy or rent properties. Browse listings and contact agents.</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleRoleSelection('agent')}
          className="w-full group p-8 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left"
        >
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Property Agent</h3>
              <p className="text-gray-600">List and manage properties. Connect with buyers and renters.</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleRoleSelection('admin')}
          className="w-full group p-8 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left"
        >
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-red-500 to-red-600 w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Administrator</h3>
              <p className="text-gray-600">Manage platform, users, and properties. Requires admin code.</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderRegisterForm = () => {
    const roleConfig = {
      'register-consumer': {
        title: 'Register as Consumer',
        subtitle: 'Create your account to start browsing properties',
        icon: HomeIcon,
        color: 'from-green-500 to-green-600'
      },
      'register-agent': {
        title: 'Register as Agent',
        subtitle: 'Create your agent account to list properties',
        icon: Briefcase,
        color: 'from-blue-500 to-blue-600'
      },
      'register-admin': {
        title: 'Register as Admin',
        subtitle: 'Create administrator account',
        icon: Shield,
        color: 'from-red-500 to-red-600'
      }
    };

    const config = roleConfig[mode as keyof typeof roleConfig];
    const Icon = config.icon;

    return (
      <div className="p-8">
        <button
          onClick={() => {
            resetForm();
            setMode('role-selection');
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Role Selection
        </button>

        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${config.color} rounded-2xl mb-4 shadow-lg`}>
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-gray-600 mt-2 text-lg">{config.subtitle}</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Minimum 6 characters"
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

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name *</label>
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
              <label className="block text-sm font-semibold text-gray-900 mb-2">Country *</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Phone *</label>
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

          {mode === 'register-admin' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Admin Code *</label>
              <input
                type="text"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter admin access code"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Contact system administrator for admin code</p>
            </div>
          )}

          {mode === 'register-agent' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">REN Number *</label>
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
                <label className="block text-sm font-semibold text-gray-900 mb-2">Agency Name (Optional)</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your agency name"
                />
              </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {mode === 'signin' && renderSignIn()}
        {mode === 'role-selection' && renderRoleSelection()}
        {(mode === 'register-admin' || mode === 'register-agent' || mode === 'register-consumer') && renderRegisterForm()}
      </div>
    </div>
  );
}
