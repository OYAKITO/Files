/**
 * Smart Learning Questionnaire JavaScript
 * Handles all interactive functionality for the questionnaire
 */

// Global variables
let currentQuestion = 0;
let correctAnswers = 0;
let totalQuestions = 0;
let currentStreak = 0;
let difficulty = 'easy';
let questions = [];
let isAnswered = false;
let selectedAnswer = null;

// Sample questions data - In production, this would come from Django backend
const sampleQuestions = [
    {
        id: 1,
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "When you add 2 + 2, you are counting: 1, 2, then 1 more, 2 more. That gives us 4!",
        correctAnswer: "4"
    },
    {
        id: 2,
        question: "Which animal says 'meow'?",
        options: ["Dog", "Cat", "Bird", "Fish"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Cats make a 'meow' sound to communicate with humans. Dogs bark, birds chirp, and fish don't make sounds!",
        correctAnswer: "Cat"
    },
    {
        id: 3,
        question: "What color do you get when you mix red and blue?",
        options: ["Green", "Purple", "Orange", "Yellow"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "When you mix red and blue paint or light, you get purple! This is how colors combine together.",
        correctAnswer: "Purple"
    },
    {
        id: 4,
        question: "How many days are there in a week?",
        options: ["5", "6", "7", "8"],
        correctIndex: 2,
        difficulty: "easy",
        explanation: "A week has 7 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday!",
        correctAnswer: "7"
    },
    {
        id: 5,
        question: "What do plants need to grow?",
        options: ["Only water", "Only sunlight", "Water, sunlight, and air", "Only soil"],
        correctIndex: 2,
        difficulty: "medium",
        explanation: "Plants need water to drink, sunlight for energy, and air (carbon dioxide) to make food through photosynthesis!",
        correctAnswer: "Water, sunlight, and air"
    }
];

/**
 * Initialize the questionnaire when page loads
 */
function initializeQuestionnaire() {
    questions = [...sampleQuestions]; // Copy the sample questions
    updateStats();
    console.log('Questionnaire initialized with', questions.length, 'questions');
}

/**
 * Start the questionnaire - triggered by Start Learning button
 */
function startQuestionnaire() {
    console.log('Starting questionnaire...');
    
    // Hide start button and show loading
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('loadingIndicator').style.display = 'block';
    
    // Simulate AI processing time with loading animation
    setTimeout(() => {
        loadQuestion();
        document.getElementById('loadingIndicator').style.display = 'none';
    }, 1500);
}

/**
 * Load and display the current question
 */
function loadQuestion() {
    // Check if we've completed all questions
    if (currentQuestion >= questions.length) {
        showCompletionMessage();
        return;
    }

    const question = questions[currentQuestion];
    console.log('Loading question', currentQuestion + 1, ':', question.question);
    
    // Reset answer state
    isAnswered = false;
    selectedAnswer = null;

    // Update question display
    document.getElementById('questionNumber').textContent = `Question ${currentQuestion + 1}`;
    document.getElementById('questionText').textContent = question.question;
    
    // Update difficulty indicator
    const difficultyIndicator = document.getElementById('difficultyIndicator');
    difficultyIndicator.textContent = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
    difficultyIndicator.className = `difficulty-indicator difficulty-${question.difficulty}`;

    // Create answer options
    createOptionElements(question);

    // Update progress bar
    updateProgressBar();
}

/**
 * Create clickable option elements for the current question
 */
function createOptionElements(question) {
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.textContent = option;
        optionElement.onclick = () => selectAnswer(index);
        optionsContainer.appendChild(optionElement);
    });
}

/**
 * Update the progress bar based on current question
 */
function updateProgressBar() {
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

/**
 * Speak the current question using TTS
 */
function speakQuestion() {
    const questionText = document.getElementById('questionText').textContent;
    speakText(questionText);
}

/**
 * Handle answer selection
 */
function selectAnswer(answerIndex) {
    if (isAnswered) return; // Prevent multiple selections

    console.log('Answer selected:', answerIndex);
    
    isAnswered = true;
    selectedAnswer = answerIndex;
    const question = questions[currentQuestion];
    const options = document.querySelectorAll('.option');
    
    totalQuestions++;
    
    if (answerIndex === question.correctIndex) {
        handleCorrectAnswer(options, answerIndex);
    } else {
        handleIncorrectAnswer(options, answerIndex, question);
    }
    
    updateStats();
}

/**
 * Handle correct answer selection
 */
function handleCorrectAnswer(options, answerIndex) {
    console.log('Correct answer!');
    
    options[answerIndex].classList.add('correct');
    correctAnswers++;
    currentStreak++;
    
    speakText("Correct! Well done!");
    document.getElementById('nextBtn').style.display = 'inline-block';
    
    // Adapt difficulty based on streak
    adaptDifficulty(true);
}

/**
 * Handle incorrect answer selection
 */
function handleIncorrectAnswer(options, answerIndex, question) {
    console.log('Incorrect answer. Correct was:', question.correctIndex);
    
    options[answerIndex].classList.add('incorrect');
    options[question.correctIndex].classList.add('correct');
    currentStreak = 0;
    
    speakText("Oops! Let me explain.");
    showExplanation(question);
    
    // Adapt difficulty based on wrong answer
    adaptDifficulty(false);
}

/**
 * Show explanation modal for incorrect answers
 */
function showExplanation(question) {
    document.getElementById('explanationText').textContent = question.explanation;
    document.getElementById('correctAnswerText').textContent = `The correct answer is: ${question.correctAnswer}`;
    document.getElementById('explanationModal').style.display = 'flex';
    
    // Animate character
    const character = document.getElementById('animatedCharacter');
    character.style.animation = 'bounce 1s infinite';
    
    // Speak explanation
    setTimeout(() => {
        speakText(question.explanation);
    }, 500);
}

/**
 * Close explanation modal
 */
function closeExplanation() {
    document.getElementById('explanationModal').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'inline-block';
    document.getElementById('retryBtn').style.display = 'inline-block';
}

/**
 * Move to next question
 */
function nextQuestion() {
    console.log('Moving to next question...');
    
    currentQuestion++;
    hideControlButtons();
    
    if (currentQuestion < questions.length) {
        // Show loading for next question
        document.getElementById('loadingIndicator').style.display = 'block';
        
        setTimeout(() => {
            loadQuestion();
            document.getElementById('loadingIndicator').style.display = 'none';
        }, 1000);
    } else {
        showCompletionMessage();
    }
}

/**
 * Retry current question (reload same question)
 */
function retryQuestion() {
    console.log('Retrying current question...');
    hideControlButtons();
    loadQuestion();
}

/**
 * Hide all control buttons
 */
function hideControlButtons() {
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('retryBtn').style.display = 'none';
}

/**
 * Adapt difficulty based on performance
 */
function adaptDifficulty(isCorrect) {
    const oldDifficulty = difficulty;
    
    if (isCorrect && currentStreak >= 3) {
        if (difficulty === 'easy') difficulty = 'medium';
        else if (difficulty === 'medium') difficulty = 'hard';
    } else if (!isCorrect) {
        if (difficulty === 'hard') difficulty = 'medium';
        else if (difficulty === 'medium') difficulty = 'easy';
    }
    
    if (oldDifficulty !== difficulty) {
        console.log('Difficulty adapted from', oldDifficulty, 'to', difficulty);
    }
}

/**
 * Text-to-speech functionality with fallbacks
 */
async function speakText(text) {
    console.log('Speaking text:', text.substring(0, 50) + '...');
    
    try {
        // Try server-side TTS first
        const response = await fetch('/api/tts/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onplay = () => console.log('Playing server TTS audio');
            audio.onerror = () => {
                console.warn('Server TTS audio failed to play, trying fallback');
                fallbackToWebTTS(text);
            };
            
            audio.play();
            return;
        } else {
            console.warn('Server TTS failed with status:', response.status);
            throw new Error('Server TTS failed');
        }
    } catch (error) {
        console.error('TTS Request Failed:', error);
        fallbackToWebTTS(text);
    }
}

/**
 * Fallback to browser's built-in Web Speech API
 */
function fallbackToWebTTS(text) {
    if ('speechSynthesis' in window) {
        console.log('Using browser TTS fallback');
        
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        // Try to use a nicer voice if available
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Google') || 
            voice.name.includes('Microsoft') ||
            voice.lang.startsWith('en')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        speechSynthesis.speak(utterance);
    } else {
        console.warn('No TTS available - neither server nor browser support');
    }
}

/**
 * Update statistics display
 */
function updateStats() {
    document.getElementById('correctCount').textContent = correctAnswers;
    document.getElementById('totalCount').textContent = totalQuestions;
    document.getElementById('streakCount').textContent = currentStreak;
}

/**
 * Show completion message when all questions are answered
 */
function showCompletionMessage() {
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    console.log('Questionnaire completed! Score:', correctAnswers, '/', totalQuestions);
    
    document.getElementById('questionText').innerHTML = `
        <h2>🎉 Congratulations! 🎉</h2>
        <p>You've completed the questionnaire!</p>
        <p>Your score: ${correctAnswers}/${totalQuestions} (${percentage}%)</p>
        <p>${getPerformanceMessage(percentage)}</p>
    `;
    
    document.getElementById('optionsContainer').innerHTML = '';
    
    const completionMessage = `Congratulations! You scored ${correctAnswers} out of ${totalQuestions}. ${getPerformanceMessage(percentage)}`;
    speakText(completionMessage);
}

/**
 * Get performance message based on score percentage
 */
function getPerformanceMessage(percentage) {
    if (percentage >= 90) return "Outstanding performance! 🌟";
    if (percentage >= 80) return "Great job! Keep up the excellent work! 👏";
    if (percentage >= 70) return "Good work! You're learning well! 👍";
    if (percentage >= 60) return "Nice effort! Keep practicing! 💪";
    return "Keep learning and trying your best! 🌱";
}

/**
 * Get CSRF token for Django requests
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Django Integration Functions
 * These functions would be used to communicate with Django backend
 */

/**
 * Get next question from Django backend based on current performance
 */
async function getNextQuestionFromDjango() {
    try {
        const response = await fetch('/get-next-question/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                'current_difficulty': difficulty,
                'correct_answers': correctAnswers,
                'total_questions': totalQuestions,
                'current_streak': currentStreak
            })
        });
        
        const data = await response.json();
        
        if (data.question) {
            questions.push(data.question);
            return data.question;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching next question:', error);
        return null;
    }
}

/**
 * Send answer data to Django backend for analytics
 */
async function sendAnswerToDjango(questionId, selectedAnswer, isCorrect) {
    try {
        const response = await fetch('/submit-answer/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                'question_id': questionId,
                'selected_answer': selectedAnswer,
                'is_correct': isCorrect,
                'difficulty': difficulty,
                'current_streak': currentStreak,
                'timestamp': new Date().toISOString()
            })
        });
        
        const data = await response.json();
        console.log('Answer submitted successfully:', data);
        
        return data;
    } catch (error) {
        console.error('Error submitting answer:', error);
        return null;
    }
}

/**
 * Load user progress from Django backend
 */
async function loadUserProgress() {
    try {
        const response = await fetch('/get-user-progress/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Restore user progress
            correctAnswers = data.correct_answers || 0;
            totalQuestions = data.total_questions || 0;
            currentStreak = data.current_streak || 0;
            difficulty = data.difficulty || 'easy';
            
            updateStats();
            console.log('User progress loaded:', data);
        }
        
        return data;
    } catch (error) {
        console.error('Error loading user progress:', error);
        return null;
    }
}

/**
 * Save user progress to Django backend
 */
async function saveUserProgress() {
    try {
        const response = await fetch('/save-user-progress/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                'correct_answers': correctAnswers,
                'total_questions': totalQuestions,
                'current_streak': currentStreak,
                'difficulty': difficulty,
                'current_question': currentQuestion,
                'timestamp': new Date().toISOString()
            })
        });
        
        const data = await response.json();
        console.log('User progress saved:', data);
        
        return data;
    } catch (error) {
        console.error('Error saving user progress:', error);
        return null;
    }
}

/**
 * Initialize Web Speech API voices (for better TTS fallback)
 */
function initializeVoices() {
    if ('speechSynthesis' in window) {
        // Load voices
        let voices = speechSynthesis.getVoices();
        
        // If voices aren't loaded yet, wait for them
        if (voices.length === 0) {
            speechSynthesis.addEventListener('voiceschanged', () => {
                voices = speechSynthesis.getVoices();
                console.log('Available voices:', voices.map(v => v.name));
            });
        } else {
            console.log('Available voices:', voices.map(v => v.name));
        }
    }
}

/**
 * Enhanced error handling wrapper
 */
function handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    // You could send error reports to Django backend here
    // sendErrorReport(error, context);
}

/**
 * Enhanced answer selection with analytics
 */
function enhancedSelectAnswer(answerIndex) {
    const startTime = Date.now();
    
    try {
        selectAnswer(answerIndex);
        
        // Send analytics data to Django
        const question = questions[currentQuestion];
        if (question) {
            sendAnswerToDjango(
                question.id, 
                answerIndex, 
                answerIndex === question.correctIndex
            );
        }
        
        // Auto-save progress
        saveUserProgress();
        
    } catch (error) {
        handleError(error, 'enhancedSelectAnswer');
    }
}

/**
 * Keyboard navigation support
 */
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        // Only handle keyboard navigation when question is active
        if (isAnswered) return;
        
        const options = document.querySelectorAll('.option');
        if (options.length === 0) return;
        
        switch(event.key) {
            case '1':
            case '2':
            case '3':
            case '4':
                const index = parseInt(event.key) - 1;
                if (index < options.length) {
                    selectAnswer(index);
                }
                break;
            case ' ': // Spacebar for TTS
                event.preventDefault();
                speakQuestion();
                break;
            case 'Enter': // Enter for next question
                if (document.getElementById('nextBtn').style.display !== 'none') {
                    nextQuestion();
                }
                break;
        }
    });
}

/**
 * Setup accessibility features
 */
function setupAccessibility() {
    // Add ARIA labels
    const questionText = document.getElementById('questionText');
    if (questionText) {
        questionText.setAttribute('aria-live', 'polite');
        questionText.setAttribute('role', 'main');
    }
    
    // Add focus management
    const ttsButton = document.getElementById('ttsButton');
    if (ttsButton) {
        ttsButton.setAttribute('aria-label', 'Read question aloud');
        ttsButton.setAttribute('title', 'Read question aloud (Spacebar)');
    }
}

/**
 * Performance monitoring
 */
function startPerformanceMonitoring() {
    // Monitor answer times
    window.questionStartTime = Date.now();
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
        console.log('Memory usage:', performance.memory);
    }
}

/**
 * Auto-save functionality
 */
function setupAutoSave() {
    // Save progress every 30 seconds
    setInterval(() => {
        if (totalQuestions > 0) {
            saveUserProgress();
        }
    }, 30000);
    
    // Save progress when user leaves page
    window.addEventListener('beforeunload', () => {
        if (totalQuestions > 0) {
            // Use sendBeacon for reliable saving on page unload
            if ('sendBeacon' in navigator) {
                const data = JSON.stringify({
                    'correct_answers': correctAnswers,
                    'total_questions': totalQuestions,
                    'current_streak': currentStreak,
                    'difficulty': difficulty,
                    'current_question': currentQuestion
                });
                
                navigator.sendBeacon('/save-user-progress/', data);
            }
        }
    });
}

/**
 * Initialize everything when page loads
 */
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing questionnaire...');
    
    try {
        // Core initialization
        initializeQuestionnaire();
        
        // Enhanced features
        initializeVoices();
        setupKeyboardNavigation();
        setupAccessibility();
        setupAutoSave();
        startPerformanceMonitoring();
        
        // Load any saved progress
        loadUserProgress();
        
        console.log('Questionnaire fully initialized');
        
    } catch (error) {
        handleError(error, 'initialization');
    }
});

/**
 * Debug utilities for development
 */
window.QuestionnaireDebug = {
    // Skip to specific question
    skipToQuestion: (questionIndex) => {
        currentQuestion = questionIndex;
        loadQuestion();
    },
    
    // Set difficulty
    setDifficulty: (newDifficulty) => {
        difficulty = newDifficulty;
        console.log('Difficulty set to:', difficulty);
    },
    
    // Add correct answers (for testing)
    addCorrectAnswers: (count) => {
        correctAnswers += count;
        totalQuestions += count;
        updateStats();
    },
    
    // Reset everything
    reset: () => {
        currentQuestion = 0;
        correctAnswers = 0;
        totalQuestions = 0;
        currentStreak = 0;
        difficulty = 'easy';
        isAnswered = false;
        selectedAnswer = null;
        updateStats();
        initializeQuestionnaire();
    },
    
    // Check current state
    getState: () => ({
        currentQuestion,
        correctAnswers,
        totalQuestions,
        currentStreak,
        difficulty,
        isAnswered,
        selectedAnswer
    })
};