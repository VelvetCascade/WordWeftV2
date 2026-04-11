import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Character } from '../types'
import { CharacterAvatar } from './CharacterAvatar'

interface MentionListProps {
    items: Character[]
    command: (props: { id: string; label: string }) => void
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command({ id: item.id, label: item.name }) // Store ID and Name
        }
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useEffect(() => setSelectedIndex(0), [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        },
    }))

    return (
        <div className="bg-white dark:bg-dark-surface shadow-xl rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden z-50 min-w-[200px]">
            <div className="p-2 bg-gray-50 dark:bg-dark-surface-alt text-xs font-bold text-gray-500 uppercase tracking-wider border-b dark:border-dark-border">
                Mention Character
            </div>
            {props.items.length ? (
                <div className="max-h-64 overflow-y-auto">
                    {props.items.map((item, index) => (
                        <button
                            className={`w-full text-left p-3 flex items-center gap-3 border-b border-gray-100 dark:border-dark-border/50 last:border-0 transition-colors ${index === selectedIndex ? 'bg-accent/10 text-accent' : 'hover:bg-gray-50 dark:hover:bg-dark-surface-alt'
                                }`}
                            key={index}
                            onClick={() => selectItem(index)}
                        >
                            <CharacterAvatar name={item.name} imageUrl={item.imageUrl} size="xs" />
                            <div>
                                <div className="font-bold text-sm dark:text-dark-text-rich">{item.name}</div>
                                <div className="text-[10px] text-gray-500">{item.role}</div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="p-4 text-center text-sm text-gray-400 italic">No result</div>
            )}
        </div>
    )
})

MentionList.displayName = 'MentionList'
