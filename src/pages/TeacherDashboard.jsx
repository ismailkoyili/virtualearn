import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LogOut, User, Users, UserPlus, CheckCircle, AlertCircle, MessageSquare, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [myStudents, setMyStudents] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningId, setAssigningId] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = collection(db, 'users');
      const querySnapshot = await getDocs(q);
      
      const mine = [];
      const unassigned = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        const isStudent = data.role === 'student' || !data.role;

        if (isStudent) {
          if (data.assignedTeacherId === user.id) {
            mine.push({ id, ...data });
          } else if (!data.assignedTeacherId) {
            unassigned.push({ id, ...data });
          }
        }
      });
      
      setMyStudents(mine);
      setUnassignedStudents(unassigned);
      setError(null);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Could not connect to the database. Please check your internet connection and Firebase configuration.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/login');
    } else {
      fetchStudents();
    }
  }, [user, navigate, fetchStudents]);

  const assignStudent = async (studentId) => {
    setAssigningId(studentId);
    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        assignedTeacherId: user.id
      });

      // Optimistic update
      const studentToMove = unassignedStudents.find(s => s.id === studentId);
      if (studentToMove) {
        setUnassignedStudents(prev => prev.filter(s => s.id !== studentId));
        setMyStudents(prev => [...prev, { ...studentToMove, assignedTeacherId: user.id }]);
      }
    } catch (error) {
      console.error("Error assigning student:", error);
      alert("Failed to assign student.");
    } finally {
      setAssigningId(null);
    }
  };

  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-brand-dark">
      {/* Dashboard Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="VirtuLearn Logo" className="h-8 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x30/0b3b60/ffffff?text=VirtuLearn" }} />
            <span className="font-bold text-xl text-gray-800 ml-2 hidden sm:block">Teacher Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.open('https://meet.google.com/', '_blank')}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors px-4 py-2 rounded-full font-medium"
            >
              <Video size={18} />
              <span className="hidden sm:block">Live Class</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors px-4 py-2 rounded-full font-medium"
            >
              <MessageSquare size={18} />
              <span className="hidden sm:block">Messages</span>
            </button>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="bg-purple-100 p-2 rounded-full text-purple-600">
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
          <h1 className="text-3xl font-bold text-gray-900">Welcome, Teacher {user.name.split(' ')[0]}!</h1>
          <p className="text-gray-600 mt-2">Manage your student roster and view unassigned students below.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3">
            <AlertCircle size={24} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* My Students Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
            <div className="px-6 py-5 border-b border-gray-100 bg-purple-50">
              <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                <Users size={20} className="text-purple-600" />
                My Assigned Students ({myStudents.length})
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : myStudents.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-gray-500">
                  <Users size={48} className="text-gray-300 mb-4" />
                  <p>You haven't assigned any students yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs font-medium">
                        <CheckCircle size={14} /> Assigned
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Unassigned Students Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
            <div className="px-6 py-5 border-b border-gray-100 bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" />
                Unassigned Students ({unassignedStudents.length})
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : unassignedStudents.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full text-gray-500">
                  <CheckCircle size={48} className="text-gray-300 mb-4" />
                  <p>All students have been assigned to a teacher!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unassignedStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => assignStudent(student.id)}
                        disabled={assigningId === student.id}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        {assigningId === student.id ? 'Assigning...' : 'Assign to me'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
