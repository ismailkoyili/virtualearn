import React from 'react';
import { motion } from 'framer-motion';
import { Book, Calculator, FlaskConical, Atom, Languages, FileText, Globe } from 'lucide-react';

const CourseCard = ({ title, description, icon: Icon, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
    <div className="w-14 h-14 bg-white shadow-md rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 mb-6 line-clamp-3">{description}</p>
    <a href="#contact" className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
      Learn More
      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
    </a>
  </motion.div>
);

const Courses = () => {
  const academicCourses = [
    { title: 'Mathematics', description: 'Comprehensive math coaching for all classes, focusing on problem-solving skills.', icon: Calculator },
    { title: 'Physics', description: 'In-depth physics classes to understand core concepts and prepare for exams.', icon: Atom },
    { title: 'Chemistry', description: 'Detailed chemistry tuition covering organic, inorganic, and physical chemistry.', icon: FlaskConical },
    { title: 'English', description: 'Improve grammar, vocabulary, and writing skills with our expert English tutors.', icon: FileText },
    { title: 'Malayalam', description: 'Strong foundational and advanced Malayalam language classes.', icon: Languages },
    { title: 'Arabic', description: 'Learn Arabic from basics to advanced levels with certified instructors.', icon: Globe },
  ];

  const islamicCourses = [
    { title: 'Quran Recitation (Malayalam)', description: 'Learn proper Tajweed and recitation with Malayalam explanations.', icon: Book },
    { title: 'Quran Recitation (English)', description: 'Learn proper Tajweed and recitation with English explanations.', icon: Book },
    { title: 'Madrasa Tuition (Malayalam)', description: 'Complete Madrasa syllabus support with Malayalam medium.', icon: Book },
    { title: 'Madrasa Tuition (English)', description: 'Complete Madrasa syllabus support with English medium.', icon: Book },
  ];

  return (
    <section id="courses" className="py-20 bg-brand-light relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">Our Programs</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Explore Our Premium Courses</h3>
            <p className="text-lg text-gray-600">
              We offer a wide range of subjects for CBSE & ICSE boards from Class 1 to Plus Two, along with specialized Islamic and language courses.
            </p>
          </motion.div>
        </div>

        <div className="mb-16">
          <h4 className="text-2xl font-bold text-gray-900 mb-8 border-l-4 border-blue-600 pl-4">Academic Subjects</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {academicCourses.map((course, index) => (
              <CourseCard key={index} {...course} delay={index * 0.1} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-2xl font-bold text-gray-900 mb-8 border-l-4 border-blue-600 pl-4">Islamic & Language Courses</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {islamicCourses.map((course, index) => (
              <CourseCard key={index} {...course} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Courses;
