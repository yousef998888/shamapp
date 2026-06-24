import React, { useEffect, useRef } from 'react';

interface UiModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  closeButton?: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' |'2xl' |'3xl' |'4xl'|'5xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',

};

function Ui_Modal({
  open,
  onClose,
  title,
  description,
  children,
  closeButton,
  actions,
  size = 'md',
}: UiModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 transition-opacity animate-fadeIn"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative bg-white rounded-xl shadow-2xl p-6 w-full ${sizeClasses[size]} animate-scaleIn`}
        tabIndex={0}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-3 end-3 text-gray-600  hover:text-gray-800 transition"
          onClick={onClose}
          aria-label="Close modal"
        >
         {closeButton ? closeButton : <h2 className="text-xl font-bold ">&times;</h2>}
        </button>
        {/* Title */}
        {title && <h2 className="text-xl font-bold mb-2">{title}</h2>}
        {/* Description */}
        {description && <p className="text-gray-500 mb-4">{description}</p>}
        {/* Content */}
        <div className="mb-4">{children}</div>
        {/* Actions */}
        {actions && <div className="flex justify-end gap-2">{actions}</div>}
      </div>
      {/* Animations */}
      <style>
        {`
          .animate-fadeIn { animation: fadeIn 0.2s; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-scaleIn { animation: scaleIn 0.2s; }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        `}
      </style>
    </div>
  );
}

export default Ui_Modal;