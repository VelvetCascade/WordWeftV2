import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { 
    XMarkIcon, 
    SwatchIcon, 
    EyeIcon, 
    ArrowLeftIcon 
} from './icons/Icons';

export interface WritingDemoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Sub-components for Interactive Mocks
const MockToolbar = () => {
    const [active, setActive] = useState<string[]>(['B']);
    const toggle = (val: string) => setActive(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
    
    return (
        <div className="bg-gray-100 dark:bg-dark-surface-alt p-2 rounded-xl flex gap-2">
            {['B', 'I', 'U', 'S'].map(btn => (
                <motion.button 
                    key={btn}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggle(btn)}
                    className={`w-10 h-10 rounded-lg font-serif font-bold transition-colors ${active.includes(btn) ? 'bg-accent text-white shadow-md' : 'bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300'}`}
                >
                    {btn}
                </motion.button>
            ))}
            <div className="w-px h-10 bg-gray-300 dark:bg-dark-border mx-2" />
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="px-3 py-1 rounded-lg bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 font-sans text-sm">H1</motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="px-3 py-1 rounded-lg bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 font-sans text-sm">H2</motion.button>
        </div>
    );
};

const MockMention = () => {
    const [typed, setTyped] = useState('');
    const [showPopover, setShowPopover] = useState(false);

    useEffect(() => {
        let current = 0;
        const target = "@Elar";
        const interval = setInterval(() => {
            if (current <= target.length) {
                setTyped(target.substring(0, current));
                if (current === target.length) setShowPopover(true);
                current++;
            } else {
                clearInterval(interval);
            }
        }, 150);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative p-6 bg-white dark:bg-dark-surface rounded-xl shadow-inner border border-gray-100 dark:border-dark-border font-serif text-lg h-32">
            The mysterious traveler stepped forward. "I am {" "}
            <span className="text-accent bg-accent/10 px-1 rounded">{typed}<span className="animate-pulse">|</span></span>
            "

            <AnimatePresence>
                {showPopover && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-[-40px] left-[60%] transform -translate-x-1/2 w-48 bg-white dark:bg-dark-surface-alt shadow-xl rounded-lg border border-gray-200 dark:border-dark-border p-2 z-10"
                    >
                        <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-primary" />
                            <div>
                                <p className="font-semibold text-sm">Elaria</p>
                                <p className="text-xs text-gray-500">Main Protagonist</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MockScratchpad = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="flex flex-col gap-4 w-full h-48 justify-center relative">
            <div className="flex justify-between items-center bg-gray-100 dark:bg-dark-surface-alt p-2 rounded-lg z-20">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Editor Toolbar</span>
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-2 rounded-md transition-colors ${isOpen ? 'bg-primary/20 text-primary' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                    <SwatchIcon className="w-5 h-5" />
                </motion.button>
            </div>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 50, opacity: 0 }}
                        className="absolute right-0 top-12 w-48 bg-white dark:bg-dark-surface-alt rounded-lg shadow-xl border border-gray-200 dark:border-dark-border p-4 z-10"
                    >
                        <h4 className="font-bold text-sm mb-3 text-gray-800 dark:text-gray-200 font-sans tracking-wide">World Building</h4>
                        <div className="space-y-2">
                            <div className="h-6 bg-gray-200 dark:bg-dark-border rounded w-full opacity-50" />
                            <div className="h-6 bg-gray-200 dark:bg-dark-border rounded w-5/6 opacity-50" />
                            <div className="h-6 bg-gray-200 dark:bg-dark-border rounded w-full opacity-50" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm italic font-sans transition-opacity">
                {isOpen ? "Scratchpad is open!" : "Click the Swatch icon to open sidebar"}
            </p>
        </div>
    );
};

const MockPreview = () => {
    const [isReaderMode, setIsReaderMode] = useState(false);

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-between items-center bg-gray-100 dark:bg-dark-surface-alt p-2 rounded-lg">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Editor Toolbar</span>
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsReaderMode(!isReaderMode)}
                    className={`p-2 rounded-md transition-colors ${isReaderMode ? 'bg-accent text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                    <EyeIcon className="w-5 h-5" />
                </motion.button>
            </div>

            <motion.div 
                animate={{ 
                    backgroundColor: isReaderMode ? '#FBF9F6' : '#FFFFFF',
                    borderColor: isReaderMode ? '#FBF9F6' : '#E5E7EB',
                }}
                className={`p-6 rounded-2xl flex-1 border font-serif transition-colors duration-500 ${isReaderMode ? 'shadow-2xl' : ''}`}
            >
                <h3 className="text-2xl font-bold mb-4 font-sans text-gray-800">Chapter 1: The Awakening</h3>
                <p className="text-gray-600 leading-relaxed">
                    The sun crested the horizon, painting the sky in vibrant hues of magenta and gold. 
                    {isReaderMode ? " (Reader Mode Preview Active)" : " [Editor mode visible]"}
                </p>
            </motion.div>
        </div>
    );
};

const SlideContent = [
    {
        id: "welcome",
        title: "Welcome to WordWeft",
        subtitle: "A frictionless writing experience.",
        desc: "Everything you need to write your story—distraction-free, automatically saved, and incredibly fast.",
        MockComponent: () => (
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full h-full flex flex-col items-center justify-center relative p-8"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/5 rounded-3xl blur-3xl opacity-50" />
                <div className="relative w-48 h-48 bg-white dark:bg-dark-surface rounded-full shadow-2xl flex items-center justify-center border-4 border-white/50 backdrop-blur-md z-10">
                    <span className="text-6xl animate-pulse">📝</span>
                </div>
            </motion.div>
        )
    },
    {
        id: "toolbar",
        title: "Dynamic Formatting",
        subtitle: "Tools when you need them.",
        desc: "Highlight text to reveal a floating menu, or use the top toolbar for standard rich-text formatting, spoilers, and footnotes.",
        MockComponent: MockToolbar
    },
    {
        id: "world",
        title: "Character Mentions",
        subtitle: "Bring your cast to life.",
        desc: "Type '@' to mention a character in your story. They automatically link to profiles and preview cards.",
        MockComponent: MockMention
    },
    {
        id: "scratchpad",
        title: "World-Building Sidebar",
        subtitle: "Reference lore instantly.",
        desc: "Click the Swatch icon in the toolbar to open your world-building scratchpad. Seamlessly browse characters, scenes, and locations without ever leaving the document.",
        MockComponent: MockScratchpad
    },
    {
        id: "preview",
        title: "Instant Reader Preview",
        subtitle: "See exactly what they see.",
        desc: "Click the Eye icon to instantly swap into reader mode, enforcing your custom typography and layout settings before you publish.",
        MockComponent: MockPreview
    },
    {
        id: "publish",
        title: "Save & Publish",
        subtitle: "Ready to share?",
        desc: "Drafts are auto-saved in the background. When your masterpiece is finished, hit Publish and let the world read it.",
        MockComponent: () => (
             <div className="flex flex-col items-center justify-center h-full gap-6 relative">
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
                 <div className="flex bg-white dark:bg-dark-surface border dark:border-dark-border p-4 rounded-2xl shadow-lg gap-4 relative z-10">
                     <motion.button whileHover={{ scale: 1.05 }} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-dark-surface-alt font-semibold text-gray-700 dark:text-gray-300">Save Draft</motion.button>
                     <motion.button 
                        whileHover={{ scale: 1.05, boxShadow: "0px 0px 15px rgba(233, 30, 99, 0.4)" }} 
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-3 rounded-xl bg-accent text-white font-bold tracking-wide"
                     >
                        Publish Chapter
                     </motion.button>
                 </div>
             </div>
        )
    }
];

export const WritingDemoModal: React.FC<WritingDemoModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);

    // Reset step when reopened
    useEffect(() => {
        if (isOpen) setStep(0);
    }, [isOpen]);

    if (!isOpen) return null;

    const currentSlide = SlideContent[step];

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-8"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-5xl bg-white dark:bg-dark-surface rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] min-h-[500px]"
                >
                    {/* Left Side - Information & Actions */}
                    <div className="md:w-5/12 p-8 md:p-12 flex flex-col justify-between border-r border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface-alt/20 z-10">
                        <div>
                            <div className="mb-8">
                                <span className="inline-block px-3 py-1 bg-accent/10 text-accent font-bold text-xs uppercase tracking-widest rounded-full mb-4">
                                    Step {step + 1} of {SlideContent.length}
                                </span>
                                
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <h2 className="text-3xl font-bold font-serif text-gray-900 dark:text-white mb-2 leading-tight">
                                            {currentSlide.title}
                                        </h2>
                                        <h3 className="text-lg font-medium text-accent mb-6">
                                            {currentSlide.subtitle}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                                            {currentSlide.desc}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Controls */}
                        <div>
                            <div className="flex gap-2 mb-8">
                                {SlideContent.map((_, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setStep(idx)}
                                        className={`h-2 rounded-full transition-all duration-500 ${idx === step ? 'w-10 bg-accent' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
                                        aria-label={`Go to step ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={onClose}
                                    className="text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium transition-colors"
                                >
                                    Skip Demo
                                </button>
                                <div className="flex gap-3">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setStep(Math.max(0, step - 1))}
                                        disabled={step === 0}
                                        className="p-3 rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 disabled:opacity-30 transition-colors hover:bg-gray-100 dark:hover:bg-dark-surface"
                                    >
                                        <ArrowLeftIcon className="w-5 h-5" />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => step < SlideContent.length - 1 ? setStep(step + 1) : onClose()}
                                        className="px-6 py-3 bg-accent text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-primary transition-all"
                                    >
                                        {step === SlideContent.length - 1 ? "Start Writing" : "Next"}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Interactive Interactive Playgrounds */}
                    <div className="flex-1 p-8 md:p-12 relative flex items-center justify-center bg-gray-50/80 dark:bg-dark-surface-alt/50 overflow-hidden">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        
                        <div className="relative w-full max-w-md">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.4 }}
                                    className="w-full"
                                >
                                    <currentSlide.MockComponent />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                    
                    {/* Close button Top Right */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-3 bg-white/80 dark:bg-dark-surface/80 hover:bg-gray-100 dark:hover:bg-dark-surface-alt backdrop-blur-sm rounded-full transition-colors z-50 text-gray-500"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
