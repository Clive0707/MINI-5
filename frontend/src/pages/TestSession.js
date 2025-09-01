import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { WordRecallTest, StroopTest, PatternRecognitionTest } from '../components/tests/Tests';

const TestSession = () => {
  const { testType } = useParams();

  const renderTest = () => {
    switch (testType) {
      case 'word_recall':
        return <WordRecallTest />;
      case 'stroop':
        return <StroopTest />;
      case 'pattern_recognition':
        return <PatternRecognitionTest />;
      default:
        return <Navigate to="/tests" replace />;
    }
  };

  return renderTest();
};

export default TestSession;
