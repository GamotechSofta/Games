import React from 'react';
import aakdaLogo from '../../config/logo';
import AuthForm from './AuthForm';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

/**
 * Non-dismissible login / sign up popup shown over the home page for logged-out users.
 * The user cannot access inner content until they authenticate.
 *
 * Props:
 * - onSuccess?: () => void — called after successful auth
 */
const AuthModal = ({ onSuccess }) => {
  useBodyScrollLock(true);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden overscroll-none touch-none px-4 py-8"
      style={{
        background: 'rgba(5,7,14,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div className="pointer-events-auto flex w-full max-w-[360px] max-h-[min(100dvh-4rem,720px)] flex-col items-center overflow-y-auto overscroll-contain touch-auto">
        <img src={aakdaLogo} alt="Aakda" className="mb-5 h-12 w-auto shrink-0 object-contain opacity-95" />
        <AuthForm onSuccess={onSuccess} />
      </div>
    </div>
  );
};

export default AuthModal;
