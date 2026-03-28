import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import toast from 'react-hot-toast';

function StoryRecall() {
  const { t } = useTranslation();
  const recognitionRef = useRef(null);
  
  const [sessionId, setSessionId] = useState(null);
  const [storyText, setStoryText] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 = story not started, -2 = story playing, 0+ = question index
  const [userAnswer, setUserAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isStoryVisible, setIsStoryVisible] = useState(false); // Hidden by default when narration starts
  const [isPaused, setIsPaused] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setUserAnswer(transcript);
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'no-speech') {
            toast.error('No speech detected. Please try again or type your answer.');
          }
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-to-Speech function with pause/resume support
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        toast.error('Speech synthesis not supported in this browser');
        resolve();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      setIsPaused(false);
      
      // Split text into sentences for better control
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      let currentSentenceIndex = 0;

      const speakSentence = () => {
        if (currentSentenceIndex >= sentences.length) {
          setIsSpeaking(false);
          setIsPaused(false);
          resolve();
          return;
        }

        // Store remaining text for resume functionality
        sentences.slice(currentSentenceIndex).join('. ');

        const utterance = new SpeechSynthesisUtterance(sentences[currentSentenceIndex].trim());
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
        };

        utterance.onend = () => {
          currentSentenceIndex++;
          if (!isPaused) {
            setTimeout(() => speakSentence(), 200); // Small pause between sentences
          }
        };

        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          setIsSpeaking(false);
          setIsPaused(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      };
      speakSentence();
    });
  };

  // Pause narration
  const pauseNarration = () => {
    if (window.speechSynthesis && isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // Resume narration
  const resumeNarration = () => {
    if (window.speechSynthesis && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  // Start story recall session
  const handleStart = async () => {
    try {
      setIsLoading(true);
      const response = await api.post('/dementia/start');
      const { sessionId: newSessionId, storyText: newStoryText, recallQuestions } = response.data;
      
      setSessionId(newSessionId);
      setStoryText(newStoryText);
      setQuestions(recallQuestions || []);
      setCurrentQuestionIndex(-2); // Story is playing
      setEvaluations([]);
      setFinalReport(null);
      setUserAnswer('');
      setIsStoryVisible(false); // Hide story text by default when narration starts
      
      toast.success('Story session started! Listen carefully...');
      
      // Narrate the story
      await speakText(newStoryText);
      
      // Show first question after story
      setCurrentQuestionIndex(0);
      toast.success('Story complete! Get ready for questions.');
    } catch (error) {
      console.error('Error starting session:', error);
      const errorMessage = error.response?.data?.error || 'Failed to start session';
      
      if (errorMessage === 'AI service not configured') {
        toast.error(
          'AI service not configured. Please add GEMINI_API_KEY to your .env file and restart the server. See SETUP_GEMINI.md for details.',
          { duration: 8000 }
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Ask current question with TTS
  const askQuestion = async (questionIndex) => {
    if (questionIndex >= questions.length) {
      // All questions answered, generate report
      await generateReport();
      return;
    }
    
    const question = questions[questionIndex];
    setUserAnswer('');
    setCurrentQuestionIndex(questionIndex);
    
    await speakText(`Question ${questionIndex + 1}: ${question}`);
    
    // Start listening after question is asked
    setTimeout(() => {
      startListening();
    }, 500);
  };

  // Start voice recognition
  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not supported. Please type your answer.');
      return;
    }

    try {
      setIsListening(true);
      recognitionRef.current.start();
      toast.success('Listening... Speak your answer.');
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
      toast.error('Could not start voice recognition. Please type your answer.');
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
      return;
    }

    try {
      setIsLoading(true);
      const question = questions[currentQuestionIndex];
      
      const response = await api.post('/dementia/answer', {
        sessionId,
        question,
        answer: userAnswer,
        questionIndex: currentQuestionIndex
      });

      const evaluation = response.data.evaluation;
      setEvaluations(prev => [...prev, {
        question,
        answer: userAnswer,
        evaluation
      }]);

      toast.success(`Answer submitted! ${evaluation.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}`);
      
      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        setUserAnswer('');
        setTimeout(() => askQuestion(nextIndex), 1500);
      } else {
        // All questions answered
        await generateReport();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error(error.response?.data?.error || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate final report
  const generateReport = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/dementia/generate-report', {
        params: { sessionId }
      });
      
      setFinalReport(response.data);
      setCurrentQuestionIndex(-1);
      toast.success('Report generated! Check results below.');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  // Skip to typing mode
  const skipToTyping = () => {
    stopListening();
    setCurrentQuestionIndex(currentQuestionIndex);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Story Recall Assessment</h1>
          <p className="text-gray-600 mb-6">Listen to the story carefully, then answer the recall questions.</p>

          {/* Microphone Icon with Ripple Effects */}
          <div className="flex justify-center mb-6">
            <div className="relative flex items-center justify-center">
              {/* Ripple circles */}
              {isSpeaking && (
                <>
                  <div className="absolute w-32 h-32 bg-blue-400 rounded-full opacity-30 animate-ping"></div>
                  <div className="absolute w-32 h-32 bg-blue-400 rounded-full opacity-20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute w-32 h-32 bg-blue-400 rounded-full opacity-10 animate-ping" style={{ animationDelay: '1s' }}></div>
                </>
              )}
              
              {/* Microphone icon */}
              <div className={`relative z-10 bg-blue-100 rounded-full p-8 transition-all duration-300 ${
                isSpeaking ? 'scale-110 shadow-2xl' : 'shadow-lg'
              }`}>
                <svg 
                  className={`w-20 h-20 text-blue-600 transition-colors duration-300 ${
                    isSpeaking ? 'text-blue-700' : ''
                  }`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Start Button */}
          {currentQuestionIndex === -1 && !sessionId && (
            <div className="text-center">
              <button
                onClick={handleStart}
                disabled={isLoading}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? 'Starting Session...' : 'Start Story Test'}
              </button>
            </div>
          )}

          {/* Story Display */}
          {storyText && (
            <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-800">📖 The Story</h2>
                <div className="flex items-center gap-2">
                  {/* Play/Pause Controls */}
                  {isSpeaking && (
                    <>
                      {isPaused ? (
                        <button
                          onClick={resumeNarration}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                          Resume
                        </button>
                      ) : (
                        <button
                          onClick={pauseNarration}
                          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Pause
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setIsStoryVisible(!isStoryVisible)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isStoryVisible ? 'Hide Textual Story' : 'Show Textual Story'}
                  </button>
                </div>
              </div>
              {isStoryVisible ? (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{storyText}</p>
              ) : (
                <div className="text-center py-8 text-gray-500 italic">
                  Story text is hidden. Listen to the narration, or click "Show Textual Story" to view the text.
                </div>
              )}
            </div>
          )}

          {/* Current Question */}
          {currentQuestionIndex >= 0 && currentQuestionIndex < questions.length && (
            <div className="mt-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h3>
              <p className="text-lg text-gray-700 mb-4">{questions[currentQuestionIndex]}</p>
              
              {/* Voice Input */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                  >
                    {isListening ? '🛑 Stop Listening' : '🎤 Start Voice Input'}
                  </button>
                  
                  <button
                    onClick={skipToTyping}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:bg-gray-400"
                  >
                    ✍️ Type Instead
                  </button>
                  
                  {isListening && (
                    <div className="flex items-center gap-2 text-red-600">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">Listening...</span>
                    </div>
                  )}
                </div>

                {/* Answer Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer {isListening && '(Speaking will auto-fill this)'}
                  </label>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSubmitAnswer();
                      }
                    }}
                    placeholder="Type or speak your answer here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="4"
                    disabled={isLoading}
                  />
                  <p className="mt-1 text-sm text-gray-500">Press Ctrl+Enter to submit</p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!userAnswer.trim() || isLoading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : `Submit Answer ${currentQuestionIndex + 1}/${questions.length}`}
                </button>
              </div>
            </div>
          )}

          {/* Evaluations Display */}
          {evaluations.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">📊 Your Answers & Evaluations</h2>
              <div className="space-y-4">
                {evaluations.map((evalItem, idx) => (
                  <div key={idx} className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">Question {idx + 1}</h4>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        evalItem.evaluation.isCorrect 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {evalItem.evaluation.isCorrect ? '✓ Correct' : '✗ Wrong'}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2"><strong>Q:</strong> {evalItem.question}</p>
                    <p className="text-gray-600 mb-3"><strong>A:</strong> {evalItem.answer}</p>
                    <p className="text-sm text-gray-700 italic border-t pt-2 mt-2">
                      {evalItem.evaluation.feedback}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Report */}
          {finalReport && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border-2 border-blue-300">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📈 Final Assessment Report</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-gray-600 mb-2">Risk-Free Score</p>
                  <p className={`text-4xl font-bold ${
                    finalReport.riskFreePercentage >= 80 ? 'text-green-600' :
                    finalReport.riskFreePercentage >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {finalReport.riskFreePercentage}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Risk-Free from Dementia</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-gray-600 mb-2">Correct Answers</p>
                  <p className="text-3xl font-bold text-green-600">{finalReport.correctAnswers}/{finalReport.totalQuestions}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-gray-600 mb-2">Incorrect Answers</p>
                  <p className="text-3xl font-bold text-red-600">{finalReport.incorrectAnswers}/{finalReport.totalQuestions}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
                <p className="text-gray-700">
                  You answered <strong>{finalReport.correctAnswers} out of {finalReport.totalQuestions}</strong> questions correctly.
                  This corresponds to a <strong>{finalReport.riskFreePercentage}%</strong> risk-free-from-dementia score.
                </p>
                {finalReport.riskFreePercentage >= 80 && (
                  <p className="text-green-700 font-medium mt-2">✓ Excellent memory recall performance!</p>
                )}
                {finalReport.riskFreePercentage >= 60 && finalReport.riskFreePercentage < 80 && (
                  <p className="text-yellow-700 font-medium mt-2">⚠️ Good memory recall, but there's room for improvement.</p>
                )}
                {finalReport.riskFreePercentage < 60 && (
                  <p className="text-red-700 font-medium mt-2">⚠️ Consider consulting with a healthcare professional for further assessment.</p>
                )}
              </div>
              
              <button
                onClick={() => {
                  setSessionId(null);
                  setStoryText('');
                  setQuestions([]);
                  setCurrentQuestionIndex(-1);
                  setEvaluations([]);
                  setFinalReport(null);
                  setUserAnswer('');
                }}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start New Test
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StoryRecall;
