
import { Question, Alternative } from '../types';

export const parseQuizText = (text: string): Question[] => {
  const questions: Question[] = [];
  const questionBlocks = text.trim().split(/\n\s*\n/);

  questionBlocks.forEach((block, index) => {
    const lines = block.trim().split('\n');
    if (lines.length < 2) return;

    const questionText = lines[0].replace(/^Pregunta \d+\.\s*/, '').trim();
    const alternatives: Alternative[] = [];
    let correctAnswerKey = '';

    lines.slice(1).forEach(line => {
      const match = line.match(/^\s*([a-zA-Z])\)\s*(.*)/);
      if (match) {
        const key = match[1].toLowerCase();
        let altText = match[2].trim();
        const isCorrect = altText.includes('(CORRECTA)');
        
        if (isCorrect) {
          altText = altText.replace(/\s*\(CORRECTA\)/i, '').trim();
          correctAnswerKey = key;
        }

        alternatives.push({ text: altText, isCorrect, key });
      }
    });

    if (questionText && alternatives.length > 0 && correctAnswerKey) {
      questions.push({
        questionText,
        alternatives,
        correctAnswerKey,
      });
    }
  });

  return questions;
};
