import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

const Instagram = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);


const Footer = () => {
  return (
    <footer className="bg-gray-950 pt-20 pb-10 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          <div className="lg:col-span-1">
            <a href="#" className="inline-block mb-6 bg-white p-2 rounded-lg">
              <img src="/logo.png" alt="VirtuLearn Logo" className="h-12 w-auto object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x50/0b3b60/ffffff?text=VirtuLearn" }} />
            </a>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Premium online tuition for CBSE & ICSE students. Empowering the next generation through personalized education.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/learnvirtu?igsh=bnBtMnI4eDdmaDQ=" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all">
                <Instagram size={20} />
              </a>
              <a href="https://wa.me/971505912360" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-green-500 hover:text-white transition-all">
                <Phone size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><a href="#home" className="text-gray-400 hover:text-blue-500 transition-colors">Home</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-blue-500 transition-colors">About Us</a></li>
              <li><a href="#courses" className="text-gray-400 hover:text-blue-500 transition-colors">Courses</a></li>
              <li><a href="#features" className="text-gray-400 hover:text-blue-500 transition-colors">Features</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-blue-500 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Popular Courses</h4>
            <ul className="space-y-4">
              <li><a href="#courses" className="text-gray-400 hover:text-blue-500 transition-colors">Mathematics</a></li>
              <li><a href="#courses" className="text-gray-400 hover:text-blue-500 transition-colors">Physics & Chemistry</a></li>
              <li><a href="#courses" className="text-gray-400 hover:text-blue-500 transition-colors">Language Subjects</a></li>
              <li><a href="#courses" className="text-gray-400 hover:text-blue-500 transition-colors">Quran Recitation</a></li>
              <li><a href="#courses" className="text-gray-400 hover:text-blue-500 transition-colors">Madrasa Tuition</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Contact Info</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone size={20} className="text-blue-500 flex-shrink-0 mt-1" />
                <span className="text-gray-400">+971 50 591 2360</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={20} className="text-blue-500 flex-shrink-0 mt-1" />
                <span className="text-gray-400">info@virtulearn.com</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-gray-800 text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} VirtuLearn. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
