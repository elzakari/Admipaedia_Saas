import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    UserCheck,
    FileEdit,
    Bell,
    GraduationCap
} from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    color: string;
}

const MobileQuickActions: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const actions: QuickAction[] = [
        {
            id: 'attendance',
            label: 'Mark Attendance',
            icon: UserCheck,
            onClick: () => console.log('Attendance'),
            color: 'bg-green-500'
        },
        {
            id: 'grade',
            label: 'Add Grade',
            icon: GraduationCap,
            onClick: () => console.log('Grade'),
            color: 'bg-blue-500'
        },
        {
            id: 'template',
            label: 'New Template',
            icon: FileEdit,
            onClick: () => console.log('Template'),
            color: 'bg-orange-500'
        },
        {
            id: 'notify',
            label: 'Send Notification',
            icon: Bell,
            onClick: () => console.log('Notify'),
            color: 'bg-purple-500'
        },
    ];

    return (
        <div className="fixed bottom-24 right-6 z-50 md:hidden">
            <AnimatePresence>
                {isOpen && (
                    <div className="flex flex-col items-end space-y-3 mb-4">
                        {actions.map((action, index) => (
                            <motion.div
                                key={action.id}
                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center space-x-3"
                            >
                                <span className="bg-white px-2 py-1 rounded shadow-md text-xs font-medium text-gray-700 whitespace-nowrap">
                                    {action.label}
                                </span>
                                <button
                                    onClick={() => {
                                        action.onClick();
                                        setIsOpen(false);
                                    }}
                                    className={`w-10 h-10 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform`}
                                    aria-label={action.label}
                                >
                                    <action.icon size={20} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-300 ${isOpen ? 'bg-red-500' : 'bg-blue-600'
                    } text-white`}
                whileTap={{ scale: 0.9 }}
                aria-label={isOpen ? 'Close actions' : 'Quick actions'}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                    <Plus size={28} />
                </motion.div>
            </motion.button>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileQuickActions;
