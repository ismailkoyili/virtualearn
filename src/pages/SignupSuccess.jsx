import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SignupSuccess = () => {
  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-teal-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-panel p-10 border border-white/40 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Account Created</h1>
          <p className="text-sm text-blue-600 font-semibold uppercase tracking-[0.2em] mb-6">Waiting for Admin Approval</p>
          <p className="text-gray-600 leading-relaxed mb-8">
            Your account has been created successfully. Please wait while an administrator reviews and approves your request.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
          >
            Go to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupSuccess;
