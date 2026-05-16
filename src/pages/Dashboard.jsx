import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, Award, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // If user is somehow null (e.g. they typed /dashboard directly without login),
  // they should really be protected by a ProtectedRoute. We'll handle it gracefully here.
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-brand-dark">
      {/* Dashboard Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="VirtuLearn Logo" className="h-8 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x30/0b3b60/ffffff?text=VirtuLearn" }} />
            <span className="font-bold text-xl text-gray-800 ml-2 hidden sm:block">Student Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <User size={18} />
              </div>
              <span className="font-medium hidden sm:block">{user.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors px-3 py-2 rounded-md hover:bg-red-50"
            >
              <LogOut size={18} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="text-gray-600 mt-2">Here's what's happening with your courses today.</p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Active Courses</h3>
                <p className="text-2xl font-bold text-blue-600">3</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <p className="text-sm text-gray-500">60% overall progress</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
                <p className="text-2xl font-bold text-purple-600">5</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Next due: Tomorrow, 11:59 PM</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-teal-100 p-3 rounded-xl text-teal-600">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Certificates</h3>
                <p className="text-2xl font-bold text-teal-600">1</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Earned: Web Development Basics</p>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Completed Lesson: React Hooks</p>
                  <p className="text-sm text-gray-500">Advanced Web Development Course</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Submitted Assignment</p>
                  <p className="text-sm text-gray-500">UI/UX Design Principles</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">Yesterday</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
