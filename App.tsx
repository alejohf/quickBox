import React, { useState, useCallback, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import { GameState, Question, UserAnswer, SpeechSettings } from './types';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Welcome);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const { voices } = useSpeechSynthesis();
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>({
    voiceURI: null,
    rate: 1,
    pitch: 1,
  });

  const score = userAnswers.filter(ua => ua.isCorrect).length;

  useEffect(() => {
    // Set the default voice once the voice list is loaded
    if (voices.length > 0 && !speechSettings.voiceURI) {
        // Prioritize "Pablo" as the default voice as requested.
        const pabloVoice = voices.find(voice => voice.name.includes('Pablo') && voice.lang.startsWith('es'));
        
        if (pabloVoice) {
            setSpeechSettings(prev => ({ ...prev, voiceURI: pabloVoice.voiceURI }));
        } else {
            // Fallback to the best available option if Pablo is not found.
            const huggingFaceVoice = 'hf:facebook/mms-tts-spa';
            const spanishVoices = voices.filter(voice => voice.lang.startsWith('es'));
            // Prefer high-quality 'neural' or 'enhanced' voices.
            const premiumSpanishVoice = spanishVoices.find(v => v.name.toLowerCase().includes('neural') || (v as any).quality === 'enhanced');
            
            setSpeechSettings(prev => ({ 
                ...prev, 
                // Set order of preference: Premium Spanish -> Any Spanish -> Hugging Face AI
                voiceURI: premiumSpanishVoice?.voiceURI || spanishVoices[0]?.voiceURI || huggingFaceVoice
            }));
        }
    }
  }, [voices, speechSettings.voiceURI]);

  const handleQuizStart = useCallback((parsedQuestions: Question[]) => {
    if (parsedQuestions.length > 0) {
      setQuestions(parsedQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setGameState(GameState.Playing);
    }
  }, []);

  const handleNextQuestion = useCallback((answer: UserAnswer) => {
    setUserAnswers(prev => [...prev, answer]);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setGameState(GameState.Results);
    }
  }, [currentQuestionIndex, questions.length]);
  
  const handleRestart = useCallback(() => {
    setQuestions([]);
    setUserAnswers([]);
    setCurrentQuestionIndex(0);
    setGameState(GameState.Welcome);
  }, []);

  const renderContent = () => {
    switch (gameState) {
      case GameState.Playing:
        return (
          <QuizScreen
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onQuestionComplete={handleNextQuestion}
            speechSettings={speechSettings}
          />
        );
      case GameState.Results:
        return (
            <ResultsScreen 
                score={score} 
                totalQuestions={questions.length}
                userAnswers={userAnswers}
                onRestart={handleRestart}
                speechSettings={speechSettings}
            />
        );
      case GameState.Welcome:
      default:
        return (
          <WelcomeScreen 
            onQuizStart={handleQuizStart} 
            voices={voices}
            speechSettings={speechSettings}
            setSpeechSettings={setSpeechSettings}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-4xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
