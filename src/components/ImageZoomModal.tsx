'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ImageZoomModalProps {
  src: string;
  onClose: () => void;
}

export default function ImageZoomModal({ src, onClose }: ImageZoomModalProps) {
  useEffect(() => {
    // Adds an event listener to close the modal when the 'Escape' key is pressed.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the event listener when the component unmounts.
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    // The overlay that covers the entire screen
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 transition-opacity duration-300" 
      onClick={onClose} // Close modal if the overlay is clicked
    >
      <button 
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2" 
        onClick={onClose} 
        aria-label="Close image zoom view"
      >
        <XMarkIcon className="h-8 w-8" />
      </button>

      {/* The container for the image itself */}
      <div 
        className="relative w-full h-full max-w-4xl max-h-[90vh] transition-transform duration-300 scale-95 animate-zoom-in" 
        onClick={(e) => e.stopPropagation()} // Prevents closing the modal when clicking the image
      >
        <Image 
          src={src} 
          alt="Zoomed meter image" 
          layout="fill" 
          className="object-contain rounded-lg" 
        />
      </div>
    </div>
  );
}

// REMINDER: Make sure you have the keyframes for the zoom animation in your global CSS file (e.g., globals.css):
/*
  @keyframes zoom-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-zoom-in {
    animation: zoom-in 0.2s ease-out forwards;
  }
*/