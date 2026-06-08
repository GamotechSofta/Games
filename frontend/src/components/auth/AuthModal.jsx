import React, { useEffect } from 'react';
import aakdaLogo from '../../config/logo';
import AuthForm from './AuthForm';

/**
 * Non-dismissible login / sign up popup shown over the home page for logged-out users.
 * The user cannot access inner content until they authenticate.
 *
 * Props:
 * - onSuccess?: () => void — called after successful auth
 */
const AuthModal = ({ onSuccess }) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto px-4 py-8"
      style={{
        background: 'rgba(5,7,14,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div className="flex w-full max-w-[360px] flex-col items-center">
        <img src={aakdaLogo} alt="Aakda" className="mb-5 h-12 w-auto object-contain opacity-95" />
        <AuthForm onSuccess={onSuccess} />
      </div>
    </div>
  );
};

export default AuthModal;
