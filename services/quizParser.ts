
import { Question, Alternative } from '../types';

export const parseQuizText = (text: string): Question[] => {
  const questions: Question[] = [];
  const questionBlocks = text.trim().split(/\n\s*\n/);

  questionBlocks.forEach((block) => {
    const lines = block.trim().split('\n');
    if (lines.length < 2) return;

    const firstAlternativeIndex = lines.findIndex(line => /^\s*[a-zA-Z]\)\s*/.test(line));

    if (firstAlternativeIndex === -1) return; // No alternatives found

    const questionText = lines.slice(0, firstAlternativeIndex).join(' ').replace(/^\d+\.\s*/, '').trim();
    const alternativeLines = lines.slice(firstAlternativeIndex);

    const alternatives: Alternative[] = [];
    let correctAnswerKey = '';

    alternativeLines.forEach(line => {
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
