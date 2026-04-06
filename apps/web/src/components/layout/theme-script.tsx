'use client';

import Script from 'next/script';

export function ThemeScript() {
  return (
    <Script
      id="theme-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
      }}
    />
  );
}
