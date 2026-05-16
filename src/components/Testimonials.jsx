import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      text: "The personalized attention my daughter received for her CBSE Mathematics exams was incredible. Her grades improved significantly within just two months of joining VirtuLearn.",
      author: "Fathima S.",
      role: "Parent of Class 10 Student"
    },
    {
      id: 2,
      text: "I highly recommend the Quran Recitation course. The instructor is very patient and explains the Tajweed rules clearly in Malayalam, which makes it very easy to understand.",
      author: "Mohammed R.",
      role: "Student"
    },
    {
      id: 3,
      text: "VirtuLearn's interactive classes are engaging and fun. I used to struggle with Physics, but the expert tutors here made the concepts crystal clear for me.",
      author: "Aisha K.",
      role: "Class 12 Student"
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    const timer = setInterval(nextTestimonial, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/50 rounded-l-[100px] -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">Testimonials</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900">What Our Students & Parents Say</h3>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Slider controls */}
          <button 
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-blue-600 z-10 hover:scale-110 transition-transform"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button 
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-blue-600 z-10 hover:scale-110 transition-transform"
          >
            <ChevronRight size={24} />
          </button>

          <div className="overflow-hidden px-4 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="glass-panel p-8 md:p-12 rounded-3xl relative"
              >
                <Quote className="absolute top-6 left-6 text-blue-100 w-16 h-16 -z-10" />
                <p className="text-xl md:text-2xl text-gray-700 leading-relaxed italic mb-8 relative z-10">
                  "{testimonials[currentIndex].text}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    {testimonials[currentIndex].author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonials[currentIndex].author}</h4>
                    <p className="text-gray-500 text-sm">{testimonials[currentIndex].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-blue-600 w-8' : 'bg-blue-200 hover:bg-blue-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
