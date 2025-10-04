import { useState, useRef, useEffect, useCallback } from 'react';

// FIX: Add type definition for the Web Speech API to resolve "Cannot find name 'SpeechRecognition'".
// This is an experimental API and its types may not be included in all TypeScript configurations.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
}

// Polyfill for cross-browser support
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const useSpeechRecognition = ({ onResult, onError }: SpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Use refs to hold the latest callbacks and state to stabilize the functions returned by the hook.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  
  const isListeningRef = useRef(isListening);
   useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (SpeechRecognitionAPI) {
      setIsAvailable(true);
      const recognition: SpeechRecognition = new SpeechRecognitionAPI();
      
      recognition.continuous = false;
      recognition.lang = 'es-ES';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (onErrorRef.current) {
          onErrorRef.current(event.error);
        }
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Call the latest callback via the ref.
        onResultRef.current(transcript.trim().toLowerCase());
      };

      recognitionRef.current = recognition;
    } else {
        setIsAvailable(false);
        console.warn("Speech recognition not supported in this browser.");
    }

    return () => {
        // Cleanup on unmount
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    }
  // This effect now runs only once on mount, creating a single, stable recognition instance.
  }, []);
  
  const startListening = useCallback(() => {
    // Use the ref to get the current value, preventing dependency on state.
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        setIsListening(false); // Force state sync on error
      }
    }
  }, []); // Empty dependency array makes this function reference stable.

  const stopListening = useCallback(() => {
    // Use the ref to get the current value.
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }
  }, []); // Empty dependency array makes this function reference stable.

  return { isListening, startListening, stopListening, isAvailable };
};

export default useSpeechRecognition;