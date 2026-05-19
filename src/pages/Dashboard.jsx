import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LogOut, User, CheckCircle, Calendar, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [todayMarked, setTodayMarked] = useState(false);

  const getTodayDateStr = () => {
    const today = new Date();
    // Use local time for date string to ensure the user's current day is recorded
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchAttendance = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'attendance'), 
        where('userId', '==', user.id)
      );
      const querySnapshot = await getDocs(q);
      const records = [];
      let markedToday = false;
      const todayStr = getTodayDateStr();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push({ id: doc.id, ...data });
        if (data.dateStr === todayStr) {
          markedToday = true;
        }
      });

      // Sort descending by dateStr
      records.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

      setAttendanceRecords(records);
      setTodayMarked(markedToday);
    } catch (error) {
      console.error("Error fetching attendance: ", error);
    } finally {
      setLoadingAttendance(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchAttendance();
    }
  }, [user, navigate, fetchAttendance]);

  const markAttendance = async () => {
    if (todayMarked) return;
    setMarkingAttendance(true);
    try {
      const todayStr = getTodayDateStr();
      const docId = `${user.id}_${todayStr}`;
      
      // Store attendance in Firestore
      await setDoc(doc(db, 'attendance', docId), {
        userId: user.id,
        dateStr: todayStr,
        timestamp: new Date().toISOString()
      });
      
      setTodayMarked(true);
      fetchAttendance(); // Refresh to get the new record and update state
    } catch (error) {
      console.error("Error marking attendance: ", error);
      alert("Failed to mark attendance. Ensure Firestore Database is created in your Firebase Console.");
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  const todayStr = getTodayDateStr();

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
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors px-4 py-2 rounded-full font-medium"
            >
              <MessageSquare size={18} />
              <span className="hidden sm:block">Messages</span>
            </button>
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
          <p className="text-gray-600 mt-2">Manage your daily attendance from this portal.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mark Attendance Section */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center"
            >
              <div className={`p-4 rounded-full mb-6 ${todayMarked ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                {todayMarked ? <CheckCircle size={48} /> : <Calendar size={48} />}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Today's Attendance</h2>
              <p className="text-gray-500 mb-8">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              {todayMarked ? (
                <div className="w-full bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle size={20} />
                  <span className="font-medium">Attendance marked for today</span>
                </div>
              ) : (
                <button
                  onClick={markAttendance}
                  disabled={markingAttendance}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {markingAttendance ? (
                    <span className="animate-pulse">Marking...</span>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>Mark Present</span>
                    </>
                  )}
                </button>
              )}
              
              <div className="mt-6 flex items-start gap-2 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl text-left">
                <AlertCircle size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p>Attendance can only be marked once per day. It cannot be edited, updated, or deleted after submission.</p>
              </div>
            </motion.div>
          </div>

          {/* Attendance History */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock size={20} className="text-gray-500" />
                  Attendance History
                </h3>
              </div>
              
              <div className="p-6 flex-1 overflow-auto">
                {loadingAttendance ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-48 text-gray-500">
                    <Calendar size={48} className="text-gray-300 mb-4" />
                    <p>No attendance records found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attendanceRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${record.dateStr === todayStr ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500'}`}>
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(record.dateStr).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500">
                              Marked at: {new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Present
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
