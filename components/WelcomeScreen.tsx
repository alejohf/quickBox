import React, { useState, useCallback } from 'react';
import { Question, SpeechSettings } from '../types';
import { parseQuizText } from '../services/quizParser';
import { defaultQuizText } from '../services/defaultQuizData';

interface WelcomeScreenProps {
  onQuizStart: (questions: Question[]) => void;
  voices: SpeechSynthesisVoice[];
  speechSettings: SpeechSettings;
  setSpeechSettings: React.Dispatch<React.SetStateAction<SpeechSettings>>;
}

const LEVEL_SIZE = 5;

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper function to chunk an array into smaller arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunkedArr: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
}

export default function WelcomeScreen({ onQuizStart, voices, speechSettings, setSpeechSettings }: WelcomeScreenProps) {
  const [questionsFromFile, setQuestionsFromFile] = useState<Question[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [levels, setLevels] = useState<Question[][]>([]);

  const isHuggingFaceVoice = speechSettings.voiceURI?.startsWith('hf:');

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLevels([]); // Reset levels if a new file is uploaded
      setFileName(file.name);
      setError('');
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const parsedQuestions = parseQuizText(text);
          if (parsedQuestions.length === 0) {
            setError('The file could not be processed. Ensure it is a valid .txt quiz file.');
            setQuestionsFromFile([]);
          } else {
            setQuestionsFromFile(parsedQuestions);
          }
        } catch (err) {
          setError('An error occurred while parsing the file.');
          setQuestionsFromFile([]);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const handleLoadDefaultQuiz = useCallback(() => {
    // 1. Parse the default quiz text
    const parsed = parseQuizText(defaultQuizText);
    // 2. Shuffle the questions to make levels random each time
    const shuffled = shuffleArray(parsed);
    // 3. Chunk the shuffled questions into levels
    const chunked = chunkArray(shuffled, LEVEL_SIZE);
    
    setLevels(chunked);

    // Reset file upload state to avoid confusion
    setQuestionsFromFile([]);
    setFileName('');
    setError('');
  }, []);

  const handleResetToUpload = () => {
    setLevels([]);
  };

  const renderFileUploadView = () => (
    <>
      <div className="w-full p-6 border-2 border-dashed border-slate-600 rounded-lg text-center">
        <p className="mb-4 text-slate-400">Upload your .txt quiz file to begin.</p>
        <label htmlFor="file-upload" className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 inline-block">
          Select File
        </label>
        <input id="file-upload" type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
        {fileName && <p className="mt-4 text-green-400">File loaded: {fileName} ({questionsFromFile.length} questions found)</p>}
        {error && <p className="mt-4 text-red-400">{error}</p>}
      </div>

      <div className="flex items-center w-full my-6">
          <div className="flex-grow border-t border-slate-600"></div>
          <span className="flex-shrink mx-4 text-slate-400">OR</span>
          <div className="flex-grow border-t border-slate-600"></div>
      </div>

      <button
        onClick={handleLoadDefaultQuiz}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
      >
        Cargar Examen de Prueba
      </button>

      <button
        onClick={() => onQuizStart(questionsFromFile)}
        disabled={questionsFromFile.length === 0}
        className="mt-8 w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-500 text-slate-900 font-bold py-4 px-8 rounded-lg text-2xl transition-all transform hover:scale-105"
      >
        Start Quiz
      </button>
    </>
  );

  const renderLevelSelectionView = () => (
    <>
        <h2 className="text-3xl font-bold text-cyan-400 mb-6">Selecciona un Nivel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-6">
            {levels.map((levelQuestions, index) => (
                <button
                    key={index}
                    onClick={() => onQuizStart(levelQuestions)}
                    className="p-8 bg-slate-700 hover:bg-indigo-600 rounded-lg text-2xl font-bold text-white transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                    Nivel {index + 1}
                </button>
            ))}
        </div>
        <button
            onClick={handleResetToUpload}
            className="mt-4 text-cyan-400 hover:underline"
        >
            Cargar un archivo diferente
        </button>
    </>
  );

  return (
    <div className="text-center bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-2xl mx-auto flex flex-col items-center animate-fade-in">
      <h1 className="text-5xl font-bold text-cyan-400 mb-2">QuizVox AI</h1>
      <p className="text-xl text-slate-300 mb-8">Your Interactive Voice-Powered Quiz Moderator</p>
      
      {levels.length > 0 ? renderLevelSelectionView() : renderFileUploadView()}

      <div className="w-full mt-8 pt-6 border-t-2 border-slate-700">
          <h3 className="text-2xl font-bold text-cyan-400 mb-4">Moderator Voice Settings</h3>
          <div className="space-y-4 text-left">
              <div>
                  <label htmlFor="voice-select" className="block mb-2 text-sm font-medium text-slate-300">Voice</label>
                  <select 
                      id="voice-select" 
                      value={speechSettings.voiceURI ?? ''} 
                      onChange={(e) => setSpeechSettings(s => ({ ...s, voiceURI: e.target.value }))}
                      className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
                  >
                      <option key="hf-mms" value="hf:facebook/mms-tts-spa">
                          ✨ Natural Spanish (AI - Hugging Face)
                      </option>
                      {voices.map(voice => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name} ({voice.lang})
                          </option>
                      ))}
                  </select>
              </div>
              <div>
                  <label htmlFor="rate-slider" className="block mb-2 text-sm font-medium text-slate-300">Speed: {speechSettings.rate.toFixed(1)}x</label>
                  <input 
                      id="rate-slider" 
                      type="range" 
                      min="0.5" 
                      max="2" 
                      step="0.1" 
                      value={speechSettings.rate}
                      onChange={(e) => setSpeechSettings(s => ({ ...s, rate: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
              </div>
              <div>
                  <label htmlFor="pitch-slider" className={`block mb-2 text-sm font-medium transition-colors ${isHuggingFaceVoice ? 'text-slate-500' : 'text-slate-300'}`}>
                      Pitch: {isHuggingFaceVoice ? 'N/A' : speechSettings.pitch.toFixed(1)}
                  </label>
                  <input 
                      id="pitch-slider" 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1" 
                      value={speechSettings.pitch}
                      onChange={(e) => setSpeechSettings(s => ({ ...s, pitch: parseFloat(e.target.value) }))}
                      disabled={isHuggingFaceVoice}
                      className={`w-full h-2 bg-slate-700 rounded-lg appearance-none transition-opacity ${isHuggingFaceVoice ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  />
              </div>
          </div>
          <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
            <p className="text-xs text-slate-400 text-center">
                To use the 'Natural Spanish (AI)' voice, you need a free API key from Hugging Face.
                <a href="https://huggingface.co/join" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline mx-1">Create an account</a>,
                get your token, and add it to the `huggingFaceService.ts` file.
            </p>
          </div>
      </div>
    </div>
  );
}