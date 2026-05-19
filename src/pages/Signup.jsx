import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, CheckCircle, User, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Creating Account...');
  const [showRedirectOption, setShowRedirectOption] = useState(false);

  const { googleSignIn, completeRegistration } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e, method = 'popup') => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setError('');
    setIsLoading(true);
    setLoadingText(method === 'popup' ? 'Opening Google Login...' : 'Redirecting to Google...');

    let popupTimer;
    if (method === 'popup') {
      popupTimer = setTimeout(() => {
        setLoadingText('Check for blocked popup...');
        setShowRedirectOption(true);
      }, 5000);
    } else {
      // Save state for when they come back
      localStorage.setItem('pendingRegistration', JSON.stringify({ name, role }));
    }

    try {
      const result = await googleSignIn(method);
      if (method === 'redirect') return; // Page will redirect

      if (popupTimer) clearTimeout(popupTimer);
      const { isNewUser, user, role: existingRole } = result;

      if (!isNewUser) {
        // User already has an account, ignore the form and just log them in
        setLoadingText('Account found! Redirecting...');
        setTimeout(() => {
          navigate(existingRole === 'teacher' ? '/teacher-dashboard' : '/dashboard');
        }, 1000);
      } else {
        // Complete registration with the info from the form
        setLoadingText('Saving your profile...');
        await completeRegistration(user.uid, name, user.email, role);
        setSuccess(true);
      }
    } catch (err) {
      clearTimeout(popupTimer);
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
      setLoadingText('Creating Account...');
    }
  };

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-teal-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>

        <div className="glass-panel p-8 sm:p-10 border border-white/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

          <div className="text-center mb-8">
            <motion.img 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              src="/logo.png" 
              alt="VirtuLearn Logo" 
              className="h-14 mx-auto mb-4 object-contain" 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x50/0b3b60/ffffff?text=VirtuLearn" }} 
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
              {success ? 'Account Created' : 'Join VirtuLearn'}
            </h1>
            <p className="text-sm font-semibold tracking-widest text-blue-600 uppercase">
              {success ? 'Pending Approval' : 'Create your account'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-50/80 border border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-2 backdrop-blur-sm"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Wait for Approval</h2>
              <p className="text-gray-600 mb-8 leading-relaxed text-sm bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                Hi <strong className="text-gray-900">{name}</strong>, your request to join as a <strong className="text-blue-700">{role}</strong> is pending administrator approval.
              </p>
              <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
                Return to Login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/60 backdrop-blur-sm transition-all outline-none"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">I want to join as a:</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Briefcase size={18} />
                  </div>
                  <select
                    value={role}
                    disabled={isLoading}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/60 backdrop-blur-sm transition-all outline-none appearance-none"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-gray-200 rounded-xl shadow-md text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all border-b-4 active:border-b-0 active:translate-y-1"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  {isLoading ? loadingText : 'Sign Up with Google'}
                </motion.button>

                {showRedirectOption && !success && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    type="button"
                    onClick={(e) => handleSignup(e, 'redirect')}
                    className="w-full py-3 px-4 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-all border border-blue-100"
                  >
                    Popup blocked? Try Redirect Method
                  </motion.button>
                )}
              </div>

              <p className="text-[11px] text-gray-500 text-center mt-4 px-4 leading-relaxed">
                By signing up, you agree to our Terms of Service and Privacy Policy. All accounts require manual verification.
              </p>

              <div className="mt-8 pt-6 border-t border-gray-200/50 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in here</Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
