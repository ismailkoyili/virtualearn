import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import Courses from '../components/Courses';
import Features from '../components/Features';
import WhyChooseUs from '../components/WhyChooseUs';
import Testimonials from '../components/Testimonials';
import Faculty from '../components/Faculty';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <>
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
    </>
  );
};

export default Home;
