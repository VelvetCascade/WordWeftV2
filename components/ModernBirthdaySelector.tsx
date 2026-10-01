import React, { useEffect, useId, useState } from 'react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Native selectors keep birthday entry reachable by keyboard and touch. */
export const ModernBirthdaySelector: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
    const id = useId();
    const [year, setYear] = useState(value.slice(0, 4));
    const [month, setMonth] = useState(value.slice(5, 7).replace(/^0/, ''));
    const [day, setDay] = useState(value.slice(8, 10).replace(/^0/, ''));
    const daysInMonth = month ? new Date(Number(year) || new Date().getFullYear(), Number(month), 0).getDate() : 31;
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        if (!value) { setYear(''); setMonth(''); setDay(''); return; }
        setYear(value.slice(0, 4)); setMonth(String(Number(value.slice(5, 7)))); setDay(String(Number(value.slice(8, 10))));
    }, [value]);

    const update = (part: 'year' | 'month' | 'day', next: string) => {
        const nextYear = part === 'year' ? next : year;
        const nextMonth = part === 'month' ? next : month;
        let nextDay = part === 'day' ? next : day;
        if (nextMonth && nextDay) nextDay = String(Math.min(Number(nextDay), new Date(Number(nextYear) || currentYear, Number(nextMonth), 0).getDate()));
        setYear(nextYear); setMonth(nextMonth); setDay(nextDay);
        if (nextYear && nextMonth && nextDay) onChange(`${nextYear}-${nextMonth.padStart(2, '0')}-${nextDay.padStart(2, '0')}`);
    };

    return <fieldset className="ww-birthday">
        <legend className="block text-sm font-medium mb-2">Birthday</legend>
        <div className="grid grid-cols-[1.7fr_1fr_1.2fr] gap-2">
            <div><label htmlFor={`${id}-month`} className="sr-only">Birth month</label><select id={`${id}-month`} value={month} required onChange={event => update('month', event.target.value)} className="w-full px-3 h-12"><option value="" disabled>Month</option>{MONTHS.map((name, index) => <option value={index + 1} key={name}>{name}</option>)}</select></div>
            <div><label htmlFor={`${id}-day`} className="sr-only">Birth day</label><select id={`${id}-day`} value={day} required onChange={event => update('day', event.target.value)} className="w-full px-3 h-12"><option value="" disabled>Day</option>{Array.from({ length: daysInMonth }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></div>
            <div><label htmlFor={`${id}-year`} className="sr-only">Birth year</label><select id={`${id}-year`} value={year} required onChange={event => update('year', event.target.value)} className="w-full px-3 h-12"><option value="" disabled>Year</option>{Array.from({ length: 110 }, (_, index) => <option key={index} value={currentYear - index}>{currentYear - index}</option>)}</select></div>
        </div>
        <p className="text-xs mt-2 text-gray-500">Your birthday stays private. WordWeft is for ages 13 and up.</p>
    </fieldset>;
};
