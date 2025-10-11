import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question, Alternative, UserAnswer, SpeechSettings } from '../types';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { MicrophoneOffIcon } from './icons/MicrophoneOffIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import Timer from './Timer';

interface QuizScreenProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswerSubmit: (answer: UserAnswer) => void;
  onGoToNext: () => void;
  onGoToPrevious: () => void;
  userAnswers: UserAnswer[];
  speechSettings: SpeechSettings;
  onExit: () => void;
}

const QUIZ_DURATION = 40;

// Audio assets for the timer functionality
const SUSPENSE_AUDIO_URL = 'https://cdn.pixabay.com/audio/2022/11/17/audio_88f892a945.mp3';
const COUNTDOWN_BEEP_AUDIO_URL = 'https://cdn.pixabay.com/audio/2024/04/24/audio_c5b365c105.mp3';
const FLATLINE_AUDIO_URL = 'https://cdn.pixabay.com/audio/2022/01/21/audio_ea3b1b4b24.mp3';

// Audio assets for feedback
const CORRECT_AUDIO_URL = 'https://cdn.pixabay.com/audio/2022/03/15/audio_721346c319.mp3';
const INCORRECT_AUDIO_URL = 'https://cdn.pixabay.com/audio/2021/08/04/audio_2bbe64a954.mp3';

const QuizScreen: React.FC<QuizScreenProps> = ({ 
  question, 
  questionNumber, 
  totalQuestions, 
  onAnswerSubmit,
  onGoToNext,
  onGoToPrevious,
  userAnswers,
  speechSettings, 
  onExit 
}) => {
  const existingAnswerObject = userAnswers.find(ua => ua.question === question.questionText);
  const isAlreadyAnswered = !!existingAnswerObject;
  const initialSelection = existingAnswerObject
      ? question.alternatives.find(alt => alt.text === existingAnswerObject.answer) || null
      : null;
      
  const [userSelection, setUserSelection] = useState<Alternative | null>(initialSelection);
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState('');
  
  const { speak, cancel: cancelSpeech, isSpeaking } = useSpeechSynthesis();
  
  const suspenseAudioRef = useRef<HTMLAudioElement | null>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const incorrectAudioRef = useRef<HTMLAudioElement | null>(null);
  const countdownBeepAudioRef = useRef<HTMLAudioElement | null>(null);
  const flatlineAudioRef = useRef<HTMLAudioElement | null>(null);

  // Use a ref to avoid stale closures in callbacks
  const isAnsweredRef = useRef(isAlreadyAnswered);
  useEffect(() => {
    isAnsweredRef.current = isAlreadyAnswered;
  }, [isAlreadyAnswered]);

  useEffect(() => {
    const createAudio = (src: string, loop = false) => {
      const audio = new Audio(src);
      audio.loop = loop;
      audio.preload = 'auto';
      audio.addEventListener('error', () => {
        console.error(`Failed to load audio source: ${src}`);
      });
      return audio;
    };
    
    suspenseAudioRef.current = createAudio(SUSPENSE_AUDIO_URL, true);
    correctAudioRef.current = createAudio(CORRECT_AUDIO_URL);
    incorrectAudioRef.current = createAudio(INCORRECT_AUDIO_URL);
    countdownBeepAudioRef.current = createAudio(COUNTDOWN_BEEP_AUDIO_URL);
    flatlineAudioRef.current = createAudio(FLATLINE_AUDIO_URL);
  }, []);

  const stopAllTimerAudio = () => {
    suspenseAudioRef.current?.pause();
    countdownBeepAudioRef.current?.pause();
    if (suspenseAudioRef.current) suspenseAudioRef.current.currentTime = 0;
    if (countdownBeepAudioRef.current) countdownBeepAudioRef.current.currentTime = 0;
  };

  const processAnswer = useCallback((selectedAlternative: Alternative | null, timedOut = false) => {
    if (isAnsweredRef.current) return;

    setIsTimerActive(false);
    cancelSpeech();
    stopAllTimerAudio();
    setUserSelection(selectedAlternative);

    const isCorrect = selectedAlternative?.isCorrect ?? false;
    const correctAnswer = question.alternatives.find(alt => alt.isCorrect);
    
    let feedbackText = '';
    let feedbackAudio: HTMLAudioElement | null = null;

    if (timedOut) {
        feedbackText = `Se acabó el tiempo. La respuesta correcta era: ${correctAnswer?.text}`;
        feedbackAudio = flatlineAudioRef.current;
    } else if (isCorrect) {
        feedbackText = '¡Correcto! ¡Muy bien!';
        feedbackAudio = correctAudioRef.current;
    } else {
        feedbackText = `Incorrecto. La respuesta correcta era: ${correctAnswer?.text}`;
        feedbackAudio = incorrectAudioRef.current;
    }

    if (feedbackAudio) {
      feedbackAudio.currentTime = 0;
      feedbackAudio.play().catch(e => console.error("Feedback audio play failed:", e));
    }

    speak(feedbackText, undefined, speechSettings);
    
    onAnswerSubmit({
        question: question.questionText,
        answer: selectedAlternative?.text ?? 'No respondida',
        correctAnswer: correctAnswer?.text ?? '',
        isCorrect: isCorrect,
    });

  }, [onAnswerSubmit, question, speak, cancelSpeech, speechSettings]);

  const handleRecognitionResult = useCallback((recognizedText: string) => {
    setRecognitionError('');
    setTranscript(`"${recognizedText}"`);
    if (isAnsweredRef.current || isSpeaking) return;

    const cleanTranscript = recognizedText.toLowerCase().trim().replace(/[.?!,]/g, '');
    const singleLetterMatch = cleanTranscript.match(/^(?:la|respuesta es)?\s*([a-d])$/);

    let foundAlt: Alternative | undefined;

    if (singleLetterMatch) {
        foundAlt = question.alternatives.find(alt => alt.key === singleLetterMatch[1]);
    } else {
        foundAlt = question.alternatives.find(alt => cleanTranscript.includes(alt.text.toLowerCase()));
    }
    
    if (foundAlt) {
        processAnswer(foundAlt);
    } else {
        speak("No he reconocido una respuesta válida. Pulsa el micrófono para intentar de nuevo.", undefined, speechSettings);
        setTranscript(`"${recognizedText}" (No reconocido)`);
    }
  }, [processAnswer, question.alternatives, speak, speechSettings, isSpeaking]);
  
  const handleAlternativeClick = (alt: Alternative) => {
    if (isAnsweredRef.current || isSpeaking) return;
    processAnswer(alt, false);
  };

  const { isListening, stopListening, isAvailable } = useSpeechRecognition({
    onResult: handleRecognitionResult,
    onError: (error) => {
        if (error === 'network') {
            setRecognitionError('Error de red. Revisa tu conexión.');
        } else if (error === 'no-speech') {
            setTranscript('No se detectó voz. Intenta de nuevo.');
        } else if (error === 'audio-capture') {
            setRecognitionError('Error de micrófono. Revisa los permisos.');
        } else {
            setRecognitionError('Error de reconocimiento.');
        }
    },
  });

  useEffect(() => {
    setTranscript('');
    setRecognitionError('');
    setTimeLeft(QUIZ_DURATION);
    setIsTimerActive(false);

    // Only speak the question and start timer if it hasn't been answered yet
    if (!isAlreadyAnswered) {
        const speakQuestion = async () => {
          await new Promise(resolve => speak(question.questionText, () => resolve(true), speechSettings));
          if (isAnsweredRef.current) return;
          
          for (const alt of question.alternatives) {
            await new Promise(resolve => speak(`${alt.key}) ${alt.text}`, () => resolve(true), speechSettings));
            if (isAnsweredRef.current) return;
          }
          
          speak("Tu tiempo empieza ahora.", () => {
              if (!isAnsweredRef.current) {
                setIsTimerActive(true);
                suspenseAudioRef.current?.play().catch(e => console.error("Suspense audio play failed:", e));
              }
          }, speechSettings);
        };
        speakQuestion();
    }

    return () => {
      cancelSpeech();
      stopListening();
      stopAllTimerAudio();
    };
  }, [question]);

  useEffect(() => {
    if (!isTimerActive) return;

    if (timeLeft === 0) {
      if (isListening) stopListening();
      processAnswer(null, true);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
          const newTimeLeft = prev - 1;
          if (newTimeLeft <= 5 && newTimeLeft > 0) {
              if (suspenseAudioRef.current && !suspenseAudioRef.current.paused) {
                  suspenseAudioRef.current.pause();
              }
              if (countdownBeepAudioRef.current) {
                  countdownBeepAudioRef.current.currentTime = 0;
                  countdownBeepAudioRef.current.play().catch(e => console.error("Countdown beep play failed:", e));
              }
          }
          return newTimeLeft;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isTimerActive, timeLeft, processAnswer, isListening, stopListening]);


  const getAlternativeBgColor = (alt: Alternative) => {
    if (!isAlreadyAnswered) return 'bg-slate-700 hover:bg-slate-600';
    if (alt.isCorrect) return 'bg-green-600';
    if (userSelection?.key === alt.key && !alt.isCorrect) return 'bg-red-600';
    return 'bg-slate-800 opacity-50';
  };

  const getAlternativeIcon = (alt: Alternative) => {
    if (!isAlreadyAnswered) return null;
    if (alt.isCorrect) return <CheckIcon />;
    if (userSelection?.key === alt.key && !alt.isCorrect) return <XIcon />;
    return null;
  }
  
  const altColors = ['bg-[#ab47ba]', 'bg-blue-500', 'bg-[#735ABA]', 'bg-[#2ab6f7]'];

  return (
    <div className="w-full mx-auto flex flex-col items-center justify-between p-4 min-h-[80vh]">
      <header className="w-full flex justify-between items-center mb-4">
        <div className="text-xl font-bold">{questionNumber} / {totalQuestions}</div>
        <Timer timeLeft={timeLeft} duration={QUIZ_DURATION} />
        <button
          onClick={onExit}
          className="bg-slate-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 text-sm"
        >
          Cerrar Examen
        </button>
      </header>

      <div className="flex-grow flex flex-col items-center justify-center w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-slate-100">{question.questionText}</h2>
        
        <div className="grid grid-cols-1 gap-4 w-full max-w-3xl">
          {question.alternatives.map((alt, index) => {
            const isInteractive = !isAlreadyAnswered && !isSpeaking;
            return (
              <div 
                key={alt.key} 
                onClick={() => handleAlternativeClick(alt)}
                className={`p-4 rounded-lg text-lg text-white transition-all duration-300 transform flex items-center justify-between
                  ${isAlreadyAnswered
                    ? getAlternativeBgColor(alt) + ' cursor-default' 
                    : isInteractive
                      ? `${altColors[index % 4]} hover:scale-105 cursor-pointer`
                      : `${altColors[index % 4]} opacity-60 cursor-not-allowed`
                  }`}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex-shrink-0 h-6 w-6 border-2 rounded-md mr-4 flex items-center justify-center transition-colors bg-white/20 border-slate-400">
                    {userSelection?.key === alt.key && (
                      <div className="h-4 w-4 bg-cyan-400 rounded-sm"></div>
                    )}
                  </div>

                  <span className="font-bold mr-4">{alt.key.toUpperCase()})</span>
                  <span className="flex-1 text-left break-words">{alt.text}</span>
                </div>
                
                <span className="ml-4 w-6 h-6 flex-shrink-0">{getAlternativeIcon(alt)}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <footer className="w-full flex flex-col items-center justify-center mt-10">
        <p className="min-h-[2rem] text-lg mb-4 text-slate-300 italic text-center">
            {isSpeaking ? 'El moderador está hablando...' : transcript}
        </p>
        
        <div
          className="inline-flex items-stretch rounded-full shadow-xl opacity-50 cursor-not-allowed mb-8"
          title="El reconocimiento de voz está temporalmente deshabilitado"
        >
          <button
            disabled={true}
            className="relative flex items-center justify-center p-4 rounded-l-full bg-slate-700"
            aria-label="Micrófono deshabilitado"
          >
            <MicrophoneOffIcon />
          </button>
          
          <div className="w-px self-stretch bg-slate-600"></div>

          <button
            disabled={true}
            className="flex items-center justify-center p-4 rounded-r-full text-white bg-slate-700"
            aria-label="Ajustes de audio deshabilitados"
          >
            <ChevronUpIcon />
          </button>
        </div>
        
        <div className="flex justify-between w-full max-w-3xl">
            <button 
                onClick={onGoToPrevious} 
                disabled={questionNumber === 1}
                className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all"
            >
                Anterior
            </button>
            <button
                onClick={onGoToNext}
                disabled={!isAlreadyAnswered}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold py-3 px-8 rounded-lg transition-all"
            >
                {questionNumber === totalQuestions ? 'Finalizar Examen' : 'Siguiente'}
            </button>
        </div>
      </footer>
    </div>
  );
};

export default QuizScreen;