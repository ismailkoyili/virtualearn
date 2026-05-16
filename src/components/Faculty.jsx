import React from 'react';
import { motion } from 'framer-motion';

const Faculty = () => {
  return (
    <section id="faculty" className="py-24 bg-brand-light relative overflow-hidden">
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Founder</h2>
          </motion.div>
        </div>

        <div className="max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-panel p-6 rounded-3xl text-center group hover:-translate-y-2 transition-all duration-300"
          >
            <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-300">
              <img 
                src="/faculty.jpeg" 
                alt="Adil Malapuram" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x400/0b3b60/ffffff?text=Adil+Malapuram" }}
              />
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-2">ADIL MALAPURAM</h4>
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 font-medium text-sm mb-4">
              Expert Instructor
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Dedicated to empowering students with exceptional guidance and personalized attention to help them achieve their highest potential.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Faculty;
