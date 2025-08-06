import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const PROMPT_DELAY = 10000; // 10 seconds
const STORAGE_KEY = 'cssJobs_signupPromptDismissed';

export const useSignupPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        // Don't show prompt if user is logged in
        if (user) {
            return;
        }

        // Don't show prompt if user has already dismissed it
        const hasBeenDismissed = localStorage.getItem(STORAGE_KEY);
        if (hasBeenDismissed) {
            return;
        }

        // Set a timer to show the prompt after the delay
        const timer = setTimeout(() => {
            setShowPrompt(true);
        }, PROMPT_DELAY);

        // Cleanup timer on unmount
        return () => clearTimeout(timer);
    }, [user]);

    const dismissPrompt = () => {
        setShowPrompt(false);
        // Remember that user dismissed the prompt for this session
        localStorage.setItem(STORAGE_KEY, 'true');
    };

    const resetPrompt = () => {
        localStorage.removeItem(STORAGE_KEY);
        setShowPrompt(false);
    };

    return {
        showPrompt,
        dismissPrompt,
        resetPrompt
    };
}; 