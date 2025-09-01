import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { WordRecallTest, StroopTest, PatternRecognitionTest } from '../components/tests/Tests';

const TestSession = () => {
  const { testType } = useParams();

  const renderTest = () => {
    switch (testType) {
      case 'word_recall':
        return <WordRecallTest onTestComplete={(score) => console.log('Word recall test completed with score:', score)} />;
      case 'stroop':
        return <StroopTest onTestComplete={(score) => console.log('Stroop test completed with score:', score)} />;
      case 'pattern_recognition':
        return <PatternRecognitionTest onTestComplete={(score) => console.log('Pattern recognition test completed with score:', score)} />;
      default:
        return <Navigate to="/tests" replace />;
    }
  };

  return renderTest();
};

export default TestSession;
