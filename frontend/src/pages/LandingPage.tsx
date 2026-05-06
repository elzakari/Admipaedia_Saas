import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu, ChevronRight, LogIn, UserPlus, ChevronDown } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import LoginForm from '../pages/auth/LoginForm';
import RegisterForm from '../pages/auth/RegisterForm';
import OfflineIndicator from '../components/common/OfflineIndicator';

// FloatingPaths component for the animated background
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(79, 70, 229, ${0.1 + i * 0.01})`, // Indigo color to match theme
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full text-indigo-600" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.01}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

const LandingPage: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRegisterOptions, setShowRegisterOptions] = useState(false);

  useEffect(() => {
    const isOpen = showLoginModal || showRegisterModal;
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showLoginModal, showRegisterModal]);
  
  // Animation for the title text
  const titleWords = "Welcome to ADMIPAEDIA".split(" ");

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // Navigation items
  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      
      {/* Enhanced Header with scroll effect */}
      <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${scrolled ? 'bg-white/90 shadow-md backdrop-blur-sm py-3' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/assets/images/Admipaedia_Logo.png" 
                alt="Admipaedia Logo" 
                className="h-10 mr-3"
              />
              <span className={`text-xl font-bold ${scrolled ? 'text-indigo-700' : 'text-indigo-700'}`}>ADMIPAEDIA</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a 
                  key={item.name}
                  href={item.href}
                  className={`font-medium transition-colors ${scrolled ? 'text-gray-700 hover:text-indigo-700' : 'text-indigo-700 hover:text-indigo-900'}`}
                >
                  {item.name}
                </a>
              ))}
              <button 
                className={`font-medium transition-colors flex items-center gap-2 ${scrolled ? 'text-gray-700 hover:text-indigo-700' : 'text-indigo-700 hover:text-indigo-900'}`}
                onClick={() => setShowLoginModal(true)}
              >
                <LogIn size={18} />
                <span>Login</span>
              </button>
              <div className="relative">
                <button 
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${scrolled ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  onClick={() => setShowRegisterOptions(!showRegisterOptions)}
                >
                  <UserPlus size={18} />
                  <span>Register</span>
                  <ChevronDown size={16} />
                </button>
                {showRegisterOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <RouterLink 
                      to="/register"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100"
                      onClick={() => setShowRegisterOptions(false)}
                    >
                      Standard Registration
                    </RouterLink>
                    <RouterLink 
                      to="/parent-register"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100"
                      onClick={() => setShowRegisterOptions(false)}
                    >
                      Register as Parent
                    </RouterLink>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile menu button */}
            <button 
              className="md:hidden text-indigo-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-200 mt-2"
            >
              <div className="px-4 py-3 space-y-3">
                {navItems.map((item) => (
                  <a 
                    key={item.name}
                    href={item.href}
                    className="block font-medium text-gray-700 hover:text-indigo-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
                <button 
                  className="block w-full text-left font-medium text-gray-700 hover:text-indigo-700 flex items-center gap-2"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLoginModal(true);
                  }}
                >
                  <LogIn size={18} />
                  <span>Login</span>
                </button>
                <div className="space-y-2">
                  <RouterLink 
                    to="/register"
                    className="block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserPlus size={18} />
                    <span>Standard Registration</span>
                  </RouterLink>
                  <RouterLink 
                    to="/parent-register"
                    className="block w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserPlus size={18} />
                    <span>Register as Parent</span>
                  </RouterLink>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Hero Section - Add padding-top to account for fixed header */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center px-4 md:px-8 py-12 pt-32 relative z-10">
        <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter">
              {titleWords.map((word, wordIndex) => (
                <span key={wordIndex} className="inline-block mr-2 last:mr-0">
                  {word.split("").map((letter, letterIndex) => (
                    <motion.span
                      key={`${wordIndex}-${letterIndex}`}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: wordIndex * 0.1 + letterIndex * 0.03,
                        type: "spring",
                        stiffness: 150,
                        damping: 25,
                      }}
                      className="inline-block text-transparent bg-clip-text 
                                bg-gradient-to-r from-indigo-700 to-indigo-500"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-lg text-gray-700 mb-8"
            >
              The comprehensive school management system designed to streamline administrative tasks,
              enhance communication, and improve educational outcomes.
            </motion.p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="inline-block group relative bg-gradient-to-b from-indigo-500/20 to-indigo-600/20 
                          p-px rounded-xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl 
                          transition-shadow duration-300"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl shadow-md 
                           hover:bg-indigo-700 focus:outline-none group-hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                  onClick={() => setShowLoginModal(true)}
                >
                  <LogIn size={18} />
                  <span className="opacity-90 group-hover:opacity-100 transition-opacity">Login</span>
                  <span className="ml-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                    →
                  </span>
                </motion.button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="inline-block group relative bg-gradient-to-b from-white/30 to-white/10 
                          p-px rounded-xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl 
                          transition-shadow duration-300"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-3 bg-white text-indigo-600 font-medium rounded-xl shadow-md 
                           hover:bg-gray-50 focus:outline-none group-hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                  onClick={() => setShowRegisterModal(true)}
                >
                  <UserPlus size={18} />
                  <span className="opacity-90 group-hover:opacity-100 transition-opacity">Register</span>
                  <span className="ml-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                    →
                  </span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
        
        <div className="md:w-1/2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-indigo-500 rounded-3xl blur-3xl opacity-20"></div>
            <motion.img
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              src="/assets/images/Admipaedia_Logo.png"
              alt="Admipaedia"
              className="w-full max-w-md mx-auto relative z-10"
            />
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="bg-white py-16 px-4 md:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-center text-gray-900 mb-12"
          >
            Key Features
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Student Management',
                description: 'Track student information, attendance, and academic performance with ease.',
                icon: '👨‍🎓',
              },
              {
                title: 'Teacher Portal',
                description: 'Empower teachers with tools to manage classes, assignments, and grades.',
                icon: '👩‍🏫',
              },
              {
                title: 'Administrative Dashboard',
                description: 'Get a comprehensive overview of your institution with powerful analytics.',
                icon: '📊',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-gradient-to-br from-white to-indigo-50/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="py-16 px-4 md:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-center text-gray-900 mb-12"
          >
            About ADMIPAEDIA
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-sm"
          >
            <p className="text-gray-700 mb-4">
              ADMIPAEDIA is a comprehensive school management system designed to streamline administrative tasks, enhance communication between teachers, students, and parents, and improve educational outcomes.
            </p>
            <p className="text-gray-700">
              Our platform provides powerful tools for managing student information, tracking academic performance, scheduling classes, and much more. With ADMIPAEDIA, educational institutions can focus more on teaching and less on administrative overhead.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact" className="bg-indigo-50 py-16 px-4 md:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-center text-gray-900 mb-12"
          >
            Contact Us
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h3>
              <p className="text-gray-700 mb-6">
                Have questions about ADMIPAEDIA? Our team is here to help. Reach out to us and we'll get back to you as soon as possible.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                    📧
                  </div>
                  <span className="text-gray-700">info@admipaedia.com</span>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                    📱
                  </div>
                  <span className="text-gray-700">+1 (555) 123-4567</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Request a Demo</h3>
              <p className="text-gray-700 mb-6">
                Want to see ADMIPAEDIA in action? Schedule a demo with one of our product specialists.
              </p>
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                <span>Schedule Demo</span>
                <ChevronRight size={16} className="ml-1" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 md:px-8 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src="/assets/images/Admipaedia_Logo.png" 
              alt="Admipaedia Logo" 
              className="h-10 mr-3 brightness-200" // Brightened for dark background
            />
            <span className="text-xl font-bold">ADMIPAEDIA</span>
          </div>
          <div className="flex flex-col md:flex-row items-center md:space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white mb-2 md:mb-0">Features</a>
            <a href="#about" className="text-gray-300 hover:text-white mb-2 md:mb-0">About</a>
            <a href="#contact" className="text-gray-300 hover:text-white mb-2 md:mb-0">Contact</a>
          </div>
          <p>&copy; {new Date().getFullYear()} ADMIPAEDIA. All rights reserved.</p>
        </div>
      </footer>

      {/* Enhanced Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <Modal
            title="Login to Your Account"
            onClose={() => setShowLoginModal(false)}
            logo="/assets/images/Admipaedia_Logo.png"
          >
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg">
              <div className="bg-white p-5 rounded-lg">
                <LoginForm onSuccess={() => setShowLoginModal(false)} />
                <div className="mt-4 text-center">
                  <p className="text-gray-600">
                    Don't have an account?{' '}
                    <button
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                      onClick={() => {
                        setShowLoginModal(false);
                        setTimeout(() => setShowRegisterModal(true), 100);
                      }}
                    >
                      Register here
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Enhanced Register Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <Modal
            title="Create Your Account"
            onClose={() => setShowRegisterModal(false)}
            logo="/assets/images/Admipaedia_Logo.png"
          >
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg">
              <div className="bg-white p-5 rounded-lg">
                <RegisterForm onSuccess={() => setShowRegisterModal(false)} />
                <div className="mt-4 text-center">
                  <p className="text-gray-600">
                    Already have an account?{' '}
                    <button
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                      onClick={() => {
                        setShowRegisterModal(false);
                        setTimeout(() => setShowLoginModal(true), 100);
                      }}
                    >
                      Login here
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

// Modal Component
interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  logo?: string;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose, logo }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useMemo(() => `modal-title-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    requestAnimationFrame(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      );
      target?.focus();
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 max-w-md w-full p-6 overflow-hidden max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            {logo && (
              <img src={logo} alt="Admipaedia Logo" className="h-8 mr-3" />
            )}
            <h2 id={titleId} className="text-2xl font-display font-bold text-slate-900 tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
