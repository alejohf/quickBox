import React, { useEffect } from 'react';
import { UserAnswer, SpeechSettings } from '../types';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';

interface ResultsScreenProps {
  score: number;
  totalQuestions: number;
  userAnswers: UserAnswer[];
  onRestart: () => void;
  speechSettings: SpeechSettings;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ score, totalQuestions, userAnswers, onRestart, speechSettings }) => {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const { speak } = useSpeechSynthesis();

  useEffect(() => {
    speak(`Has completado el cuestionario. Tu puntuación es ${score} de ${totalQuestions}.`, undefined, speechSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, totalQuestions]);

  const getPerformanceMessage = () => {
    if (percentage === 100) return "¡Perfecto! ¡Excelente trabajo!";
    if (percentage >= 80) return "¡Muy bien hecho!";
    if (percentage >= 50) return "¡Buen intento! Sigue practicando.";
    return "No te rindas. ¡La próxima vez será mejor!";
  };

  return (
    <div className="text-center bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-3xl mx-auto flex flex-col items-center animate-fade-in">
      <h2 className="text-4xl font-bold text-cyan-400 mb-2">Resultados del Cuestionario</h2>
      <p className="text-xl text-slate-300 mb-6">{getPerformanceMessage()}</p>
      
      <div className="text-6xl font-bold mb-8">
        <span className={percentage >= 50 ? 'text-green-400' : 'text-red-400'}>{score}</span>
        <span className="text-3xl text-slate-400"> / {totalQuestions}</span>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-4 mb-8">
        <div 
          className={`h-4 rounded-full ${percentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <div className="w-full text-left max-h-60 overflow-y-auto pr-2 mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-slate-200">Resumen de Respuestas</h3>
        {userAnswers.map((ua, index) => (
          <div key={index} className="mb-4 p-4 bg-slate-900 rounded-lg border-l-4 border-slate-600">
            <p className="font-semibold text-slate-300">{index + 1}. {ua.question}</p>
            <div className={`flex items-center mt-2 ${ua.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {ua.isCorrect ? <CheckIcon /> : <XIcon />}
              <p className="ml-2">Tu respuesta: {ua.answer}</p>
            </div>
            {!ua.isCorrect && (
              <p className="mt-1 text-slate-400">Correcta: {ua.correctAnswer}</p>
            )}
          </div>
        ))}
      </div>
      
      <button
        onClick={onRestart}
        className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold py-4 px-8 rounded-lg text-2xl transition-transform transform hover:scale-105"
      >
        Jugar de Nuevo
      </button>
    </div>
  );
};

export default ResultsScreen;
