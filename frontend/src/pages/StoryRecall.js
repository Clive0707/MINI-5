import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

function StoryRecall() {
  const { user, token } = useAuth();
  const videoRef = useRef(null);
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

  // Text-to-Speech function with video sync
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        toast.error('Speech synthesis not supported in this browser');
        resolve();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Split text into sentences for better control
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      let currentSentenceIndex = 0;

      const speakSentence = () => {
        if (currentSentenceIndex >= sentences.length) {
          setIsSpeaking(false);
          if (videoRef.current) {
            videoRef.current.pause();
          }
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(sentences[currentSentenceIndex].trim());
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          setIsSpeaking(true);
          if (videoRef.current) {
            videoRef.current.play().catch(err => console.error('Video play error:', err));
          }
        };

        utterance.onend = () => {
          currentSentenceIndex++;
          setTimeout(() => speakSentence(), 200); // Small pause between sentences
        };

        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          setIsSpeaking(false);
          if (videoRef.current) {
            videoRef.current.pause();
          }
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakSentence();
    });
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
      
      toast.success('Story session started! Listen carefully...');
      
      // Narrate the story
      await speakText(newStoryText);
      
      // Show first question after story
      setCurrentQuestionIndex(0);
      toast.success('Story complete! Get ready for questions.');
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error(error.response?.data?.error || 'Failed to start session');
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
        answer: userAnswer
      });

      const evaluation = response.data.evaluation;
      setEvaluations(prev => [...prev, {
        question,
        answer: userAnswer,
        evaluation
      }]);

      toast.success(`Answer submitted! Score: ${evaluation.score}/10`);
      
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

          {/* AI Avatar Video */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <video
                ref={videoRef}
                src="/ai-avatar.mp4"
                className="w-80 h-80 object-cover rounded-lg shadow-lg border-4 border-blue-200"
                muted
                loop
                playsInline
                style={{ display: videoRef.current?.readyState >= 2 ? 'block' : 'none' }}
              />
              {isSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-blue-500 bg-opacity-20 rounded-full p-4 animate-pulse">
                    <svg className="w-16 h-16 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
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
              <h2 className="text-xl font-semibold text-gray-800 mb-3">📖 The Story</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{storyText}</p>
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
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        evalItem.evaluation.score >= 8 ? 'bg-green-100 text-green-800' :
                        evalItem.evaluation.score >= 6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Score: {evalItem.evaluation.score}/10
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2"><strong>Q:</strong> {evalItem.question}</p>
                    <p className="text-gray-600 mb-3"><strong>A:</strong> {evalItem.answer}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-600">Accuracy:</span>
                        <span className={`ml-2 font-semibold ${
                          evalItem.evaluation.accuracy === 'high' ? 'text-green-600' :
                          evalItem.evaluation.accuracy === 'medium' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {evalItem.evaluation.accuracy}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-600">Comprehension:</span>
                        <span className={`ml-2 font-semibold ${
                          evalItem.evaluation.comprehension === 'good' ? 'text-green-600' :
                          evalItem.evaluation.comprehension === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {evalItem.evaluation.comprehension}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-600">Memory:</span>
                        <span className={`ml-2 font-semibold ${
                          evalItem.evaluation.memoryRetention === 'strong' ? 'text-green-600' :
                          evalItem.evaluation.memoryRetention === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {evalItem.evaluation.memoryRetention}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-600">Communication:</span>
                        <span className={`ml-2 font-semibold ${
                          evalItem.evaluation.communication === 'clear' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {evalItem.evaluation.communication}
                        </span>
                      </div>
                    </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-gray-600">Average Score</p>
                  <p className="text-3xl font-bold text-blue-600">{finalReport.averageScore.toFixed(1)}/10</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-gray-600">Total Questions</p>
                  <p className="text-3xl font-bold text-blue-600">{finalReport.totalAnswers}</p>
                </div>
              </div>
              
              {finalReport.categories && (
                <div className="bg-white p-4 rounded-lg mb-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Category Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {Object.entries(finalReport.categories).map(([key, value]) => (
                      <div key={key}>
                        <p className="font-medium text-gray-700 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        {typeof value === 'object' ? (
                          <ul className="text-gray-600 space-y-1">
                            {Object.entries(value).map(([k, v]) => (
                              <li key={k}>{k}: {v}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-600">{value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
