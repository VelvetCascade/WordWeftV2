import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons/Icons';
import { usePresence } from '../hooks/usePresence';

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
    const present = usePresence(isOpen);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const close = (restoreFocus = false) => {
        setIsOpen(false);
        if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: PointerEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const frame = requestAnimationFrame(() => {
            (menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]') || menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]'))?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    const keyboard = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) { event.preventDefault(); event.stopPropagation(); close(true); return; }
        if (event.key === 'Tab') { close(); return; }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (!isOpen) { setIsOpen(true); return; }
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') || []);
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus({ preventScroll: true });
    };

    const selectedOption = options.find(o => o.value === value);

    return (
        <div ref={dropdownRef} className="relative" onKeyDown={keyboard} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
            <button
                type="button"
                ref={triggerRef}
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
            {present && <div
                ref={menuRef}
                role="menu"
                aria-label={label}
                data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} aria-hidden={!isOpen || undefined}
                className="ww-presence ww-sort-menu absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden
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
                                tabIndex={-1}
                                aria-checked={isSelected}
                                key={option.value}
                                onClick={() => { onChange(option.value); close(true); }}
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
