/**
 * SPEX - Google Sign-In Button
 * زر "الدخول عبر Google" باستخدام مكتبة Google Identity Services (GSI).
 * يُحمَّل السكربت الرسمي عند الحاجة فقط، ويُرسل رمز الهوية (ID token) إلى onCredential
 * دون أي منطق مصادقة هنا — القرار (دخول أو ربط) يُترك للمكوّن المستخدم لهذا الزر.
 */
import React, { useEffect, useId, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('تعذر تحميل سكربت Google.')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('تعذر تحميل سكربت Google.'));
    document.head.appendChild(script);
  });
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void | Promise<void>;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  text = 'continue_with',
  disabled = false
}) => {
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState('');
  const domId = useId();

  useEffect(() => {
    if (!clientId || disabled) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            if (response?.credential) onCredential(response.credential);
          }
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'center',
          width: 320
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError('تعذر تحميل زر الدخول عبر Google. تحقق من اتصالك بالإنترنت.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, disabled, text]);

  const handleCustomGoogleSignIn = async () => {
    if (disabled) return;
    try {
      // 1. Fetch OAuth URL or trigger Google login prompt
      const res = await fetch('/api/auth/google/url');
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          const popup = window.open(url, 'google_oauth_popup', 'width=550,height=650');
          if (!popup) {
            alert('يرجى السماح بالنوافذ المنبثقة (Popups) لتسجيل الدخول عبر Google.');
          }
          return;
        }
      }
      
      // Fallback: If GSI script is loaded, prompt user
      if (window.google?.accounts?.id && clientId) {
        window.google.accounts.id.prompt();
      } else {
        setLoadError('يرجى تزويد معرف VITE_GOOGLE_CLIENT_ID أو إكمال ربط Google OAuth.');
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={handleCustomGoogleSignIn}
        disabled={disabled}
        className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs rounded-2xl shadow-md border border-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>تسجيل الدخول المباشر بحساب Google</span>
      </button>
    );
  }

  if (loadError) {
    return <p className="text-[11px] text-rose-500 text-center">{loadError}</p>;
  }

  return <div id={`gsi-btn-${domId}`} ref={containerRef} className="flex justify-center w-full" />;
};
