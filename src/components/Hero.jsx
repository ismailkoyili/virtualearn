import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Video, Users, CheckCircle } from 'lucide-react';

const Hero = () => {
  return (
    <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-50/50 blur-3xl opacity-60"></div>
        {/* Floating Shapes */}
        <motion.div 
          animate={{ y: [0, 20, 0], rotate: [0, 10, 0] }} 
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 left-20 opacity-20"
        >
          <BookOpen size={48} className="text-blue-600" />
        </motion.div>
        <motion.div 
          animate={{ y: [0, -20, 0], rotate: [0, -10, 0] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 right-20 opacity-20"
        >
          <Video size={64} className="text-blue-500" />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12 lg:mb-0"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-medium text-sm mb-6 shadow-sm">
              An Online Learning Solution
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-900">
              Premium Online Tuition for <span className="text-gradient">CBSE & ICSE</span> Students
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl leading-relaxed">
              Expert coaching for school students from Class 1 to Plus Two. Special focus on Arabic, English, Malayalam, Mathematics, Physics, Chemistry, Quran Recitation & Madrasa Tuition.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-10">
              <a href="#courses" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-medium text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1">
                Join Now
              </a>
              <a href="#contact" className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 px-8 py-3.5 rounded-full font-medium text-lg transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
                Contact Us
              </a>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> Live Classes
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> Expert Tutors
              </div>
            </div>
          </motion.div>

          {/* Image/Graphic */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-[8px] border-white z-10 bg-white">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Students learning online" 
                className="w-full h-auto object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent"></div>
            </div>

            {/* Floating Info Cards */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 glass-panel rounded-xl p-4 flex items-center gap-4 z-20 shadow-xl"
            >
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-500 font-medium">Happy Students</div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -top-6 -right-6 glass-panel rounded-xl p-4 flex items-center gap-4 z-20 shadow-xl"
            >
              <div className="bg-green-100 p-3 rounded-full text-green-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">100%</div>
                <div className="text-sm text-gray-500 font-medium">Success Rate</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
