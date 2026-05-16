import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Mail, MapPin } from 'lucide-react';

const Instagram = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);


const ContactInfoCard = ({ icon: Icon, title, content, href, delay, colorClass }) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="glass-panel p-6 rounded-2xl flex items-center gap-6 hover:-translate-y-2 transition-all duration-300 group"
  >
    <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner ${colorClass}`}>
      <Icon size={28} className="text-white" />
    </div>
    <div>
      <h4 className="text-gray-500 font-medium text-sm mb-1">{title}</h4>
      <p className="text-gray-900 font-bold text-lg group-hover:text-blue-600 transition-colors">{content}</p>
    </div>
  </motion.a>
);

const Contact = () => {
  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-blue-400 font-semibold tracking-wide uppercase text-sm mb-3">Get In Touch</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to Start Learning?</h3>
            <p className="text-lg text-gray-300">
              Reach out to us today to enroll or inquire about our courses. Our team is always ready to help you out.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <ContactInfoCard 
            icon={Phone} 
            title="Call Us Directly" 
            content="+917034313208" 
            href="tel:+917034313208"
            colorClass="bg-blue-600"
            delay={0.1} 
          />
          <ContactInfoCard 
            icon={MessageCircle} 
            title="Chat on WhatsApp" 
            content="+917034313208" 
            href="https://wa.me/917034313208"
            colorClass="bg-[#25D366]"
            delay={0.2} 
          />
          <ContactInfoCard 
            icon={Instagram} 
            title="Follow Us" 
            content="@learnvirtu" 
            href="https://www.instagram.com/learnvirtu?igsh=bnBtMnI4eDdmaDQ="
            colorClass="bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]"
            delay={0.3} 
          />
        </div>
      </div>
    </section>
  );
};

export default Contact;
