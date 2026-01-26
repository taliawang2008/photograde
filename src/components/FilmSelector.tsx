import React, { useState, useRef, useEffect } from 'react';
import type { FilmType } from '../types';
import { filmTypeList } from '../engine/filmProfiles';

interface FilmSelectorProps {
    value: FilmType;
    onChange: (value: FilmType) => void;
    onPreview?: (value: FilmType | null) => void;  // Called on hover for live preview
}

interface FilmCategory {
    name: string;
    icon: string;
    films: typeof filmTypeList;
}

const FilmSelector: React.FC<FilmSelectorProps> = ({ value, onChange, onPreview }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                onPreview?.(null);  // Reset preview when closing
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onPreview]);

    // Get current film info
    const currentFilm = filmTypeList.find(f => f.value === value) || filmTypeList[0];

    // Organize films by category
    const categories: FilmCategory[] = [
        {
            name: 'Kodak Color',
            icon: '📷',
            films: filmTypeList.filter(f =>
                ['none', 'kodak-gold', 'portra-160', 'portra-400', 'portra-800', 'ektar', 'ultramax', 'colorplus'].includes(f.value)
            ),
        },
        {
            name: 'Fuji Color',
            icon: '📷',
            films: filmTypeList.filter(f => ['superia', 'fuji-400h', 'fuji-c200'].includes(f.value)),
        },
        {
            name: 'Slide Films',
            icon: '🎞️',
            films: filmTypeList.filter(f => f.category === 'slide'),
        },
        {
            name: 'Cinema',
            icon: '🎬',
            films: filmTypeList.filter(f => f.category === 'cinema'),
        },
        {
            name: 'Black & White',
            icon: '⬛',
            films: filmTypeList.filter(f => f.category === 'bw'),
        },
    ];

    const handleSelect = (filmValue: FilmType) => {
        onChange(filmValue);
        onPreview?.(null);  // Clear preview on select
        setIsOpen(false);
    };

    const handleMouseEnter = (filmValue: FilmType) => {
        onPreview?.(filmValue);  // Trigger live preview on the actual image
    };

    const handleMouseLeave = () => {
        onPreview?.(null);  // Reset to original when mouse leaves
    };

    const handleDropdownClose = () => {
        setIsOpen(false);
        onPreview?.(null);
    };

    return (
        <div className="film-selector-dropdown" ref={dropdownRef}>
            {/* Selected Film Display */}
            <button
                className="film-selector-button"
                onClick={() => {
                    if (isOpen) {
                        handleDropdownClose();
                    } else {
                        setIsOpen(true);
                    }
                }}
            >
                <div className="selected-film-info">
                    <div className={`film-preview-small ${currentFilm.value}`}></div>
                    <span className="selected-film-name">{currentFilm.label}</span>
                </div>
                <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="film-dropdown-menu">
                    {/* Categories */}
                    <div className="film-categories-scroll">
                        {categories.map(category => (
                            <div key={category.name} className="film-category">
                                <div className="film-category-header">
                                    {category.icon} {category.name}
                                </div>
                                <div className="film-category-items">
                                    {category.films.map(film => (
                                        <button
                                            key={film.value}
                                            className={`film-dropdown-item ${value === film.value ? 'active' : ''}`}
                                            onClick={() => handleSelect(film.value)}
                                            onMouseEnter={() => handleMouseEnter(film.value)}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <div className={`film-preview-tiny ${film.value}`}></div>
                                            <span>{film.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilmSelector;
