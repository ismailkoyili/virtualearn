import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AttendanceCalendar = ({ attendanceRecords = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  
  // Create a map of attendance records for quick lookup: { "YYYY-MM-DD": record }
  const attendanceMap = attendanceRecords.reduce((acc, record) => {
    acc[record.dateStr] = record;
    return acc;
  }, {});

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Total days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add the actual days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      // Format as YYYY-MM-DD
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        dateStr: dateStr,
      });
    }
    
    setCalendarDays(days);
  }, [currentDate]);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const todayStr = (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  })();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full"
    >
      <div className="px-6 py-5 border-b border-gray-100 bg-blue-50/30 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar size={20} className="text-blue-500" />
          Attendance Calendar
        </h3>
        
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1 rounded-md hover:bg-gray-200 transition-colors text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium text-gray-700 w-32 text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-md hover:bg-gray-200 transition-colors text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {calendarDays.map((dayObj, index) => {
            if (!dayObj) {
              return <div key={`empty-${index}`} className="bg-transparent p-2 min-h-[80px]" />;
            }
            
            const isToday = dayObj.dateStr === todayStr;
            const record = attendanceMap[dayObj.dateStr];
            const isPresent = !!record;
            
            let timeStr = null;
            if (isPresent && record.timestamp) {
              const d = new Date(record.timestamp);
              timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return (
              <div 
                key={dayObj.dateStr} 
                className={`
                  relative border rounded-lg p-1.5 flex flex-col items-center min-h-[80px] transition-all
                  ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}
                  ${isPresent && !isToday ? 'bg-green-50/50 border-green-200' : ''}
                  ${isPresent && isToday ? 'border-blue-500 bg-green-50' : ''}
                `}
              >
                <span className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                  ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700'}
                `}>
                  {dayObj.dayNumber}
                </span>
                
                {isPresent && (
                  <div className="flex flex-col items-center justify-center flex-1 w-full gap-0.5 mt-1">
                    <CheckCircle size={14} className="text-green-500" />
                    {timeStr && (
                      <span className="text-[8px] sm:text-[10px] font-semibold text-green-700 bg-green-100/80 px-0.5 sm:px-1.5 py-0.5 rounded text-center leading-none sm:leading-tight w-full break-words max-w-full">
                        {timeStr}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-600 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
              <CheckCircle size={8} className="text-green-500" />
            </div>
            <span>Present</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AttendanceCalendar;
