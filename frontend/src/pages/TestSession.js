import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { WordRecallTest, StroopTest, PatternRecognitionTest } from '../components/tests/Tests';

const TestSession = () => {
  const { testType } = useParams();

  const renderTest = () => {
    switch (testType) {
      case 'word_recall':
        return <WordRecallTest onTestComplete={(score) => console.log('HVLT-R completed with score:', score)} />;
      case 'stroop':
        return <StroopTest onTestComplete={(score) => console.log('Stroop Color–Word completed with score:', score)} />;
      case 'pattern_recognition':
        return <PatternRecognitionTest onTestComplete={(score) => console.log('PRM test completed with score:', score)} />;
      default:
        return <Navigate to="/tests" replace />;
    }
  };

  return renderTest();
};

export default TestSession;
