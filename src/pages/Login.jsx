import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { googleSignIn } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const { isNewUser, role } = await googleSignIn();

      if (isNewUser) {
        // Redirect to signup to select role
        navigate('/signup');
      } else if (role === 'teacher') {
        navigate('/teacher-dashboard');
      } else if (role === 'student') {
        navigate('/dashboard');
      } else {
        setError("Account status unknown. Please contact support.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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

          <div className="text-center mb-10">
            <motion.img 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              src="/logo.png" 
              alt="VirtuLearn Logo" 
              className="h-16 mx-auto mb-4 object-contain" 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x50/0b3b60/ffffff?text=VirtuLearn" }} 
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">VirtuLearn</h1>
            <p className="text-sm font-semibold tracking-widest text-blue-600 uppercase">Portal Login</p>
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

          <div className="space-y-6">
            <p className="text-sm text-gray-600 text-center mb-4">
              Access the Student or Teacher portal using your authorized Google account.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl shadow-md text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {isLoading ? 'Connecting...' : 'Sign in with Google'}
            </motion.button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 px-2 text-gray-500 backdrop-blur-sm">New to VirtuLearn?</span>
              </div>
            </div>

            <Link
              to="/signup"
              className="w-full flex justify-center py-3 px-4 border border-blue-600 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all text-center"
            >
              Create an Account
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200/50 text-center">
            <Link
              to="/admin-login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider"
            >
              <Shield size={14} />
              Administrator Access
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
