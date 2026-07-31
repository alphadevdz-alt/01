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

  if (!clientId) return null; // الميزة غير مفعّلة (لا يوجد VITE_GOOGLE_CLIENT_ID) — لا نعرض شيئاً

  if (loadError) {
    return <p className="text-[11px] text-rose-500 text-center">{loadError}</p>;
  }

  return <div id={`gsi-btn-${domId}`} ref={containerRef} className="flex justify-center w-full" />;
};
