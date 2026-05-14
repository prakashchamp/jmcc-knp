'use client';

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/lib/redux/store';
import { fetchAllMatches } from '@/app/lib/redux/slices/statsSlice';
import { requestNotificationPermission, messaging } from '@/app/lib/notifications/push-notifications';
import { subscribeToMatchUpdates } from '@/app/lib/actions/notification-actions';
import { onMessage } from 'firebase/messaging';

export function PWAManager() {
  const dispatch = useDispatch<AppDispatch>();
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    // 1. Register Service Worker and initialize FCM
    const setupFCM = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const params = new URLSearchParams({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
          });
          const swUrl = `/firebase-messaging-sw.js?${params.toString()}`;
          const registration = await navigator.serviceWorker.register(swUrl);
          console.log('Service Worker registered with scope:', registration.scope);

          // Wait until the service worker is active
          const readyRegistration = await navigator.serviceWorker.ready;

          const token = await requestNotificationPermission(readyRegistration);
          if (token) {
            console.log('FCM Token retrieved:', token);
            await subscribeToMatchUpdates(token);
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    setupFCM();

    // 2. Listen for foreground messages
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        
        // Force show OS notification even when app is open
        if (Notification.permission === 'granted' && payload.notification) {
          new Notification(payload.notification.title || 'Update', {
            body: payload.notification.body,
            icon: '/jmcc.jpg'
          });
        }

        if (payload.data?.type === 'MATCH_UPDATE') {
          handleDataUpdate();
        }
      });
      return () => unsubscribe();
    }
  }, [messaging]);

  useEffect(() => {
    // 3. Listen for messages from Service Worker (background updates)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MATCH_UPDATE') {
        console.log('Service Worker broadcasted MATCH_UPDATE');
        handleDataUpdate();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, []);

  const handleDataUpdate = () => {
    console.log('Refreshing application data due to match update...');
    // Refresh Redux stats
    dispatch(fetchAllMatches(true));
    // Increment counter to trigger re-renders of hooks that depend on it
    setRefreshCounter(prev => prev + 1);
    
    // Optional: Show a toast/notification to the user
    if ('Notification' in window && Notification.permission === 'granted') {
       // We already got a push, browser might show it. 
       // This is for internal UI feedback if needed.
    }
  };

  return null; // This component doesn't render anything
}

/**
 * Hook to get the refresh counter for components that need to re-fetch data
 * when a push notification is received.
 */
export function useDataRefresh() {
  // In a real app, this might be globally shared via Context or Redux
  // For now, we'll rely on Redux fetchAllMatches and manual hook updates if needed
  return 0; 
}
