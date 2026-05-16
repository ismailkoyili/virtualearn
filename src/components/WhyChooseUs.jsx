import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const WhyChooseUs = () => {
  const points = [
    "Personalized attention",
    "Strong support for language subjects",
    "Modern online teaching methods",
    "Friendly and interactive classes",
    "Student progress tracking",
    "Quality teaching with affordable fees",
    "Separate support for school and madrasa education"
  ];

  return (
    <section className="py-24 bg-brand-light relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-12 lg:mb-0"
          >
            <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">Why Choose VirtuLearn</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Discover the VirtuLearn Difference</h3>
            <p className="text-lg text-gray-600 mb-8">
              We go beyond traditional teaching. Our modern approach ensures that every student gets the attention they need to succeed in their unique academic journey.
            </p>

            <div className="space-y-4">
              {points.map((point, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700 font-medium">{point}</span>
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-10"
            >
              <a href="#contact" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg shadow-blue-500/30">
                Get Started Today
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1571260899304-425dea573d4c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Student studying" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply"></div>
            </div>
            
            {/* Decorative dots */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[radial-gradient(#3b82f6_2px,transparent_2px)] [background-size:16px_16px] opacity-30 -z-10"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[radial-gradient(#3b82f6_2px,transparent_2px)] [background-size:16px_16px] opacity-30 -z-10"></div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
