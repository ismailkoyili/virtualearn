import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Briefcase, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Google Auth, 2: Role Selection, 3: Success
  const [tempUser, setTempUser] = useState(null);

  const { googleSignIn, completeRegistration } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { isNewUser, user, role: existingRole } = await googleSignIn();
      if (!isNewUser) {
        // User already exists, redirect based on role
        navigate(existingRole === 'teacher' ? '/teacher-dashboard' : '/dashboard');
      } else {
        // New user, move to role selection
        setTempUser(user);
        setStep(2);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!tempUser) return;
    setError('');
    setIsLoading(true);
    try {
      await completeRegistration(tempUser.uid, tempUser.displayName, tempUser.email, role);
      setSuccess(true);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] right-[20%] w-[40%] h-[40%] bg-teal-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>

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
              {step === 1 ? 'Join VirtuLearn' : step === 2 ? 'Select Your Role' : 'Account Created'}
            </h1>
            <p className="text-sm font-semibold tracking-widest text-blue-600 uppercase">
              {step === 1 ? 'Sign up with Google' : step === 2 ? 'Almost there' : 'Pending Approval'}
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

          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 text-center mb-4">
                Students and Teachers must use their Google account to register for a secure experience.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignup}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {isLoading ? 'Connecting...' : 'Continue with Google'}
              </motion.button>
              <div className="mt-8 pt-6 border-t border-gray-200/50 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in here</Link>
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 text-center mb-4 italic">
                Signed in as: <span className="font-bold text-gray-900">{tempUser?.email}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">I am a:</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setRole('student')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${role === 'student' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <Briefcase size={24} className="mb-2" />
                    <span className="font-bold">Student</span>
                  </button>
                  <button
                    onClick={() => setRole('teacher')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${role === 'teacher' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <UserPlus size={24} className="mb-2" />
                    <span className="font-bold">Teacher</span>
                  </button>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCompleteRegistration}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                {isLoading ? 'Processing...' : 'Complete Registration'}
              </motion.button>
            </div>
          )}

          {step === 3 && (
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
                Hi <strong className="text-gray-900">{tempUser?.displayName}</strong>, your request to join as a <strong className="text-blue-700">{role}</strong> is pending administrator approval.
              </p>
              <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
                Return to Login
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Internal replacement for missing UserPlus import if needed, but let's assume it's available or use a standard one
const UserPlus = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <line x1="19" y1="8" x2="19" y2="14"></line>
    <line x1="22" y1="11" x2="16" y2="11"></line>
  </svg>
);

export default Signup;
