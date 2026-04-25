'use client';

import { useEffect } from 'react';

export default function MobileInputHandler() {
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // 1. Only open keypad on touch
    // We set inputmode="none" to all inputs, and restore it on touchstart
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach((input) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement;
      if (!el.dataset.originalInputMode) {
        el.dataset.originalInputMode = el.inputMode || (el.type === 'number' ? 'numeric' : 'text');
        el.inputMode = 'none';
      }
    });

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const input = target.closest('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
      if (input) {
        input.inputMode = (input.dataset.originalInputMode as any) || 'text';
      }
    };

    // Also handle dynamic inputs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const newInputs = node.querySelectorAll('input, textarea');
            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
              const el = node as HTMLInputElement | HTMLTextAreaElement;
              if (!el.dataset.originalInputMode) {
                el.dataset.originalInputMode = el.inputMode || (el.type === 'number' ? 'numeric' : 'text');
                el.inputMode = 'none';
              }
            }
            
            newInputs.forEach((input) => {
              const el = input as HTMLInputElement | HTMLTextAreaElement;
              if (!el.dataset.originalInputMode) {
                el.dataset.originalInputMode = el.inputMode || (el.type === 'number' ? 'numeric' : 'text');
                el.inputMode = 'none';
              }
            });
          }
        });
      });
    });

    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    observer.observe(document.body, { childList: true, subtree: true });

    // 2. Keep input above keypad
    let timeout: any;
    const handleVisualViewportResize = () => {
      if (window.visualViewport && document.activeElement) {
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
          // If viewport height decreased significantly, keyboard probably opened
          if (window.visualViewport.height < window.innerHeight * 0.8) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300); // Wait for keyboard animation
          }
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      window.visualViewport.addEventListener('scroll', handleVisualViewportResize);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      observer.disconnect();
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportResize);
      }
    };
  }, []);

  return null;
}
