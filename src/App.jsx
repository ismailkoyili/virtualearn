import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Courses from './components/Courses';
import Features from './components/Features';
import WhyChooseUs from './components/WhyChooseUs';
import Testimonials from './components/Testimonials';
import Faculty from './components/Faculty';
import Contact from './components/Contact';
import Footer from './components/Footer';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex justify-center items-center bg-[#f8fafc]"
          >
            <motion.img 
              src="/logo.png" 
              alt="VirtuLearn Loading..." 
              className="max-w-[300px]"
              animate={{ opacity: [1, 0.7, 1], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-brand-light font-sans text-brand-dark overflow-x-hidden">
        <Navbar />
        <main>
          <Hero />
          <About />
          <Courses />
          <Features />
          <WhyChooseUs />
          <Testimonials />
          <Faculty />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}

export default App;
