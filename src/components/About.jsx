import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Video, Award } from 'lucide-react';

const StatCard = ({ icon: Icon, number, label, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center text-center hover:shadow-xl transition-shadow group"
  >
    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors duration-300">
      <Icon size={32} className="text-blue-600 group-hover:text-white transition-colors duration-300" />
    </div>
    <h3 className="text-3xl font-bold text-gray-900 mb-2">{number}</h3>
    <p className="text-gray-500 font-medium">{label}</p>
  </motion.div>
);

const About = () => {
  return (
    <section id="about" className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">About VirtuLearn</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Empowering Students Through Quality Online Education</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              VirtuLearn is a modern online tuition platform dedicated to providing personalized learning, live interactive classes, and individual attention. With our experienced teachers and flexible timings, we ensure every student achieves their academic goals.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
          <StatCard icon={Users} number="1000+" label="Students Enrolled" delay={0.1} />
          <StatCard icon={BookOpen} number="15+" label="Subjects" delay={0.2} />
          <StatCard icon={Video} number="5000+" label="Live Sessions" delay={0.3} />
          <StatCard icon={Award} number="99%" label="Success Rate" delay={0.4} />
        </div>
      </div>
    </section>
  );
};

export default About;
