import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons/Icons';

export interface SortOption {
    value: string;
    label: string;
}

interface SortDropdownProps {
    options: SortOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ options, value, onChange, label = 'Sort by' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen]);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className="group flex items-center gap-2.5 font-sans text-sm font-medium pl-4 pr-3 py-2.5 rounded-xl
          bg-white dark:bg-dark-surface-alt
          border border-gray-200 dark:border-dark-border
          shadow-sm hover:shadow-md
          hover:border-accent/40 dark:hover:border-accent/40
          transition-all duration-200 ease-out cursor-pointer whitespace-nowrap"
            >
                <span className="text-text-body dark:text-dark-text-body">
                    <span className="hidden sm:inline text-text-muted dark:text-dark-text-muted">{label}:</span>{' '}
                    <span className="font-semibold text-text-rich dark:text-dark-text-rich">{selectedOption?.label}</span>
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-text-muted dark:text-dark-text-muted transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown panel */}
            {isOpen && <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden
          bg-white dark:bg-dark-surface-alt
          border border-gray-100 dark:border-dark-border
          shadow-xl dark:shadow-2xl
          origin-top-right z-30"
            >
                <div className="p-1.5">
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={isSelected}
                                key={option.value}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm font-sans transition-all duration-150
                  ${isSelected
                                        ? 'bg-accent/10 dark:bg-accent/15 text-accent font-semibold'
                                        : 'text-text-body dark:text-dark-text-body hover:bg-gray-50 dark:hover:bg-dark-surface font-medium'
                                    }`}
                            >
                                <span className="flex-1">{option.label}</span>
                                {isSelected && (
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-accent" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>}
        </div>
    );
};
