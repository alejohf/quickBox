import { useState, useEffect, useCallback, useRef } from 'react';
import { generateHuggingFaceAudio } from '../services/huggingFaceService';

interface SpeakOptions {
  voiceURI?: string | null;
  rate?: number;
  pitch?: number;
}

const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use a ref to hold the latest voices array to stabilize the `speak` callback.
  const voicesRef = useRef(voices);
  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);


  useEffect(() => {
    const handleVoicesChanged = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged(); // Initial load
    
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, onEnd?: () => void, options: SpeakOptions = {}) => {
    if (!text) return;
    
    cancel(); // Ensure any previous speech is stopped

    const { voiceURI, rate = 1, pitch = 1 } = options;

    if (voiceURI?.startsWith('hf:')) {
      const model = voiceURI.split(':')[1];
      try {
        setIsSpeaking(true);
        const audioBlob = await generateHuggingFaceAudio(text, model);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const cleanup = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
        };
        
        audio.onended = () => {
            cleanup();
            if (onEnd) onEnd();
        };
        audio.onerror = (e) => {
            console.error("Hugging Face audio playback error:", e);
            cleanup();
        };
        
        audio.playbackRate = rate;
        audio.play().catch(e => {
            console.error("Failed to play Hugging Face audio:", e);
            cleanup();
        });
        return; // Success, don't fall through
      } catch (error) {
        console.warn("Hugging Face API failed. Falling back to a standard browser voice.", error);
        setIsSpeaking(false); // Reset before falling back
      }
    }

    // Fallback to standard browser voices
    const utterance = new SpeechSynthesisUtterance(text);

    // Use the voices from the ref to avoid dependency on state.
    const currentVoices = voicesRef.current;

    if (voiceURI && !voiceURI.startsWith('hf:')) {
      const selectedVoice = currentVoices.find(v => v.voiceURI === voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Default to the best available Spanish voice if HF fails or no voice is selected
      const spanishVoices = currentVoices.filter(voice => voice.lang.startsWith('es'));
      const premiumSpanishVoice = spanishVoices.find(v => v.name.toLowerCase().includes('neural') || (v as any).quality === 'enhanced');
      utterance.voice = premiumSpanishVoice || spanishVoices[0] || currentVoices[0];
    }
    
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
        // Log the specific error reason for better debugging.
        console.error("Browser speech synthesis error:", e.error);
        setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [cancel]);

  return { speak, cancel, isSpeaking, voices };
};

export default useSpeechSynthesis;