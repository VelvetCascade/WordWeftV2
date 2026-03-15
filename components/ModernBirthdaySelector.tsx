import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from './icons/Icons'; // Assuming this exists or using a simple SVG

interface ModernBirthdaySelectorProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export const ModernBirthdaySelector: React.FC<ModernBirthdaySelectorProps> = ({ value, onChange }) => {
    const [month, setMonth] = useState<string>('');
    const [day, setDay] = useState<string>('');
    const [year, setYear] = useState<string>('');

    // Active dropdown state
    const [activeDropdown, setActiveDropdown] = useState<'month' | 'day' | 'year' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse initial value
    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d) {
                setYear(y);
                setMonth(m.replace(/^0+/, ''));
                setDay(d.replace(/^0+/, ''));
            }
        }
    }, [value]);

    // Update parent when all 3 fields are selected
    useEffect(() => {
        if (month && day && year) {
            const paddedMonth = month.padStart(2, '0');
            const paddedDay = day.padStart(2, '0');
            const newDate = `${year}-${paddedMonth}-${paddedDay}`;
            if (newDate !== value) {
                onChange(newDate);
            }
        } else {
            // If any is cleared, clear the whole date
            if (value !== '') {
               onChange('');
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, day, year]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDaysInMonth = (m: string, y: string) => {
        if (!m) return 31;
        const monthNum = parseInt(m);
        const yearNum = y ? parseInt(y) : new Date().getFullYear();
        return new Date(yearNum, monthNum, 0).getDate();
    };

    const daysCount = getDaysInMonth(month, year);
    
    // Ensure selected day is valid for the new month/year
    useEffect(() => {
        if (day && parseInt(day) > daysCount) {
            setDay(daysCount.toString());
        }
    }, [month, year, daysCount, day]);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
    const days = Array.from({ length: daysCount }, (_, i) => (i + 1).toString());

    const toggleDropdown = (dropdown: 'month' | 'day' | 'year') => {
        setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    };

    const DropdownItem = ({ children, isSelected, onClick }: { children: React.ReactNode, isSelected: boolean, onClick: () => void }) => (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                ${isSelected 
                    ? 'bg-accent/10 text-accent font-semibold dark:bg-accent/20 dark:text-accent-light' 
                    : 'text-text-body dark:text-dark-text-body hover:bg-gray-50 dark:hover:bg-dark-surface-alt'}
            `}
        >
            {children}
        </button>
    );

    return (
        <div className="relative flex flex-col gap-1 w-full" ref={containerRef}>
            <label className="block text-sm font-sans font-medium text-text-body dark:text-dark-text-body">
                Birthday
            </label>
            
            <div className="flex gap-2">
                {/* Month Selector */}
                <div className="relative flex-[2]">
                    <button
                        type="button"
                        onClick={() => toggleDropdown('month')}
                        className={`w-full h-11 px-4 flex items-center justify-between rounded-xl font-sans text-sm transition-all duration-300
                            ${activeDropdown === 'month' ? 'ring-2 ring-accent border-transparent' : 'border border-gray-300 dark:border-dark-border'}
                            bg-white dark:bg-dark-surface-alt 
                            ${!month ? 'text-gray-400 dark:text-gray-500' : 'text-text-rich dark:text-dark-text-rich'}
                            shadow-sm hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none`}
                    >
                        <span className="truncate">{month ? MONTHS[parseInt(month) - 1] : 'Month'}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'month' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {activeDropdown === 'month' && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border z-50 animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                            {MONTHS.map((m, i) => (
                                <DropdownItem 
                                    key={m} 
                                    isSelected={month === (i + 1).toString()} 
                                    onClick={() => { setMonth((i + 1).toString()); setActiveDropdown('day'); }}
                                >
                                    {m}
                                </DropdownItem>
                            ))}
                        </div>
                    )}
                </div>

                {/* Day Selector */}
                <div className="relative flex-1">
                    <button
                        type="button"
                        onClick={() => toggleDropdown('day')}
                        disabled={!month}
                        className={`w-full h-11 px-3 flex items-center justify-between rounded-xl font-sans text-sm transition-all duration-300
                            ${activeDropdown === 'day' ? 'ring-2 ring-accent border-transparent' : 'border border-gray-300 dark:border-dark-border'}
                            bg-white dark:bg-dark-surface-alt 
                            ${!day ? 'text-gray-400 dark:text-gray-500' : 'text-text-rich dark:text-dark-text-rich'}
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300
                            shadow-sm hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none`}
                    >
                        <span>{day || 'Day'}</span>
                        <ChevronDownIcon className={`w-4 h-4 ml-1 flex-shrink-0 transition-transform duration-300 ${activeDropdown === 'day' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {activeDropdown === 'day' && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border z-50 animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                            {days.map(d => (
                                <DropdownItem 
                                    key={d} 
                                    isSelected={day === d} 
                                    onClick={() => { setDay(d); setActiveDropdown('year'); }}
                                >
                                    {d}
                                </DropdownItem>
                            ))}
                        </div>
                    )}
                </div>

                {/* Year Selector */}
                <div className="relative flex-[1.25]">
                    <button
                        type="button"
                        onClick={() => toggleDropdown('year')}
                        className={`w-full h-11 px-3 flex items-center justify-between rounded-xl font-sans text-sm transition-all duration-300
                            ${activeDropdown === 'year' ? 'ring-2 ring-accent border-transparent' : 'border border-gray-300 dark:border-dark-border'}
                            bg-white dark:bg-dark-surface-alt 
                            ${!year ? 'text-gray-400 dark:text-gray-500' : 'text-text-rich dark:text-dark-text-rich'}
                            shadow-sm hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none`}
                    >
                        <span>{year || 'Year'}</span>
                        <ChevronDownIcon className={`w-4 h-4 ml-1 flex-shrink-0 transition-transform duration-300 ${activeDropdown === 'year' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {activeDropdown === 'year' && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border z-50 animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                            {years.map(y => (
                                <DropdownItem 
                                    key={y} 
                                    isSelected={year === y} 
                                    onClick={() => { setYear(y); setActiveDropdown(null); }}
                                >
                                    {y}
                                </DropdownItem>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* Hidden native input for required validation if needed, though we handle validation manually in AuthPage */}
            <input type="hidden" name="birthday" value={value} required />
        </div>
    );
};
