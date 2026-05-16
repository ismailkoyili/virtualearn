import React from 'react';
import { motion } from 'framer-motion';
import { Video, UserCheck, Video as RecordedIcon, Star, DollarSign, Target, Users, HelpCircle, Clock } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex items-center gap-4 hover:-translate-y-1 transition-transform"
  >
    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600">
      <Icon size={24} />
    </div>
    <h4 className="font-semibold text-gray-800">{title}</h4>
  </motion.div>
);

const Features = () => {
  const featuresList = [
    { title: 'Live Interactive Classes', icon: Video },
    { title: 'One-to-One Support', icon: UserCheck },
    { title: 'Recorded Sessions', icon: RecordedIcon },
    { title: 'Experienced Faculty', icon: Star },
    { title: 'Affordable Fees', icon: DollarSign },
    { title: 'Exam-Oriented Prep', icon: Target },
    { title: 'Small Batch Learning', icon: Users },
    { title: 'Doubt Clearing', icon: HelpCircle },
    { title: 'Flexible Timings', icon: Clock },
  ];

  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">Why Us</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Premium Features for Maximum Growth</h3>
            <p className="text-lg text-gray-600">
              We provide all the tools and support necessary for students to excel in their academics and beyond.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((feature, index) => (
            <FeatureCard key={index} {...feature} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
