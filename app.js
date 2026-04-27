/**
 * Civil Procedure Quiz - Application Logic
 * B.L.A.S.T Protocol Implementation
 */

// ============================================================================
// State Management
// ============================================================================
const AppState = {
    currentView: 'dashboard',
    quizQuestions: [],
    currentIndex: 0,
    score: 0,
    answers: [], // Array of { questionId, isCorrect }
    hasAnsweredCurrent: false,
    
    // Stats
    stats: {
        totalQuestions: 0,
        answered: 0,
        correct: 0
    }
};

// ============================================================================
// DOM Elements
// ============================================================================
const Elements = {
    // Nav
    navDashboard: document.getElementById('nav-dashboard'),
    navQuiz: document.getElementById('nav-quiz'),
    
    // Views
    viewDashboard: document.getElementById('view-dashboard'),
    viewQuiz: document.getElementById('view-quiz'),
    viewResults: document.getElementById('view-results'),
    
    // Dashboard
    statTotal: document.getElementById('stat-total'),
    statCompleted: document.getElementById('stat-completed'),
    statScore: document.getElementById('stat-score'),
    btnStartRandom: document.getElementById('btn-start-random'),
    
    // Quiz Interface
    quizProgressFill: document.getElementById('quiz-progress-fill'),
    quizProgressText: document.getElementById('quiz-progress-text'),
    btnExitQuiz: document.getElementById('btn-exit-quiz'),
    qTopic: document.getElementById('q-topic'),
    qText: document.getElementById('q-text'),
    qOptions: document.getElementById('q-options'),
    
    // Feedback
    feedbackPanel: document.getElementById('feedback-panel'),
    feedbackHeader: document.getElementById('feedback-header'),
    feedbackText: document.getElementById('feedback-text'),
    feedbackReading: document.getElementById('feedback-reading'),
    btnNextQuestion: document.getElementById('btn-next-question'),
    
    // Results
    finalScore: document.getElementById('final-score'),
    rCorrect: document.getElementById('r-correct'),
    rIncorrect: document.getElementById('r-incorrect'),
    btnReturnHome: document.getElementById('btn-return-home')
};

// ============================================================================
// Initialization
// ============================================================================
function initApp() {
    // Check if QUESTIONS data is loaded
    if (typeof QUESTIONS === 'undefined') {
        console.error("QUESTIONS data not found. Ensure data/questions.js is loaded.");
        return;
    }
    
    AppState.stats.totalQuestions = QUESTIONS.length;
    updateDashboardStats();
    attachEventListeners();
}

function attachEventListeners() {
    // Navigation
    Elements.navDashboard.addEventListener('click', () => switchView('dashboard'));
    Elements.navQuiz.addEventListener('click', () => {
        if (AppState.quizQuestions.length > 0 && AppState.currentIndex < AppState.quizQuestions.length) {
            switchView('quiz');
        } else {
            startQuiz(10); // Start a 10-question quiz by default
        }
    });
    
    // Actions
    Elements.btnStartRandom.addEventListener('click', () => startQuiz(10));
    Elements.btnExitQuiz.addEventListener('click', () => switchView('dashboard'));
    Elements.btnNextQuestion.addEventListener('click', handleNextQuestion);
    Elements.btnReturnHome.addEventListener('click', () => switchView('dashboard'));
}

// ============================================================================
// View Management
// ============================================================================
function switchView(viewName) {
    // Hide all views
    Elements.viewDashboard.style.display = 'none';
    Elements.viewQuiz.style.display = 'none';
    Elements.viewResults.style.display = 'none';
    
    // Update nav buttons
    Elements.navDashboard.classList.remove('active');
    Elements.navQuiz.classList.remove('active');
    
    // Show selected view
    AppState.currentView = viewName;
    
    switch (viewName) {
        case 'dashboard':
            Elements.viewDashboard.style.display = 'block';
            Elements.navDashboard.classList.add('active');
            updateDashboardStats();
            break;
        case 'quiz':
            Elements.viewQuiz.style.display = 'block';
            Elements.navQuiz.classList.add('active');
            break;
        case 'results':
            Elements.viewResults.style.display = 'block';
            Elements.navQuiz.classList.add('active');
            break;
    }
}

function updateDashboardStats() {
    Elements.statTotal.textContent = AppState.stats.totalQuestions;
    Elements.statCompleted.textContent = AppState.stats.answered;
    
    const scorePct = AppState.stats.answered > 0 
        ? Math.round((AppState.stats.correct / AppState.stats.answered) * 100) 
        : 0;
    
    Elements.statScore.textContent = `${scorePct}%`;
}

// ============================================================================
// Quiz Logic
// ============================================================================
function startQuiz(numQuestions) {
    // Shuffle and select questions
    const shuffled = [...QUESTIONS].sort(() => 0.5 - Math.random());
    AppState.quizQuestions = shuffled.slice(0, Math.min(numQuestions, QUESTIONS.length));
    
    // Reset state
    AppState.currentIndex = 0;
    AppState.score = 0;
    AppState.answers = [];
    
    loadQuestion();
    switchView('quiz');
}

function loadQuestion() {
    AppState.hasAnsweredCurrent = false;
    Elements.feedbackPanel.style.display = 'none';
    
    const q = AppState.quizQuestions[AppState.currentIndex];
    
    // Update Progress
    const progress = ((AppState.currentIndex) / AppState.quizQuestions.length) * 100;
    Elements.quizProgressFill.style.width = `${progress}%`;
    Elements.quizProgressText.textContent = `Question ${AppState.currentIndex + 1} of ${AppState.quizQuestions.length}`;
    
    // Render Question
    Elements.qTopic.textContent = q.topic || 'General Civil Procedure';
    Elements.qText.textContent = q.questionText;
    
    // Render Options
    Elements.qOptions.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E'];
    
    q.options.forEach((optText, index) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.dataset.index = index;
        
        btn.innerHTML = `
            <div class="option-letter">${letters[index]}</div>
            <div class="option-text">${optText}</div>
        `;
        
        btn.addEventListener('click', () => handleOptionSelect(index));
        Elements.qOptions.appendChild(btn);
    });
}

function handleOptionSelect(selectedIndex) {
    if (AppState.hasAnsweredCurrent) return; // Prevent multiple answers
    AppState.hasAnsweredCurrent = true;
    
    const q = AppState.quizQuestions[AppState.currentIndex];
    const isCorrect = selectedIndex === q.correctAnswerIndex;
    
    // Update global stats
    AppState.stats.answered++;
    if (isCorrect) {
        AppState.stats.correct++;
        AppState.score++;
    }
    
    AppState.answers.push({ id: q.id, isCorrect });
    
    // Update UI for options
    const optionBtns = Elements.qOptions.querySelectorAll('.option-btn');
    optionBtns.forEach((btn, idx) => {
        // Disable cursor
        btn.style.cursor = 'default';
        
        if (idx === q.correctAnswerIndex) {
            btn.classList.add('correct');
        } else if (idx === selectedIndex && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });
    
    showFeedback(isCorrect, q);
}

function showFeedback(isCorrect, questionData) {
    Elements.feedbackPanel.style.display = 'block';
    
    // Update Badge
    if (isCorrect) {
        Elements.feedbackPanel.className = 'feedback-panel glass-card correct-feedback fade-in';
        Elements.feedbackHeader.innerHTML = `<div class="feedback-badge badge-correct">✓ Correct</div>`;
    } else {
        Elements.feedbackPanel.className = 'feedback-panel glass-card incorrect-feedback fade-in';
        Elements.feedbackHeader.innerHTML = `<div class="feedback-badge badge-incorrect">✕ Incorrect</div>`;
    }
    
    // Update Content
    Elements.feedbackText.textContent = questionData.rationale || "No rationale provided.";
    
    if (questionData.recommendedReading) {
        Elements.feedbackReading.style.display = 'block';
        Elements.feedbackReading.querySelector('p').textContent = questionData.recommendedReading;
    } else {
        Elements.feedbackReading.style.display = 'none';
    }
    
    // Update Next Button Text
    if (AppState.currentIndex === AppState.quizQuestions.length - 1) {
        Elements.btnNextQuestion.textContent = "View Results ➔";
    } else {
        Elements.btnNextQuestion.textContent = "Next Question ➔";
    }
    
    // Scroll to feedback
    Elements.feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function handleNextQuestion() {
    if (AppState.currentIndex < AppState.quizQuestions.length - 1) {
        AppState.currentIndex++;
        loadQuestion();
        // Scroll to top of quiz
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        showResults();
    }
}

function showResults() {
    const total = AppState.quizQuestions.length;
    const correct = AppState.score;
    const incorrect = total - correct;
    const percentage = Math.round((correct / total) * 100);
    
    Elements.finalScore.textContent = `${percentage}%`;
    Elements.rCorrect.textContent = correct;
    Elements.rIncorrect.textContent = incorrect;
    
    switchView('results');
}

// Boot the app
document.addEventListener('DOMContentLoaded', initApp);
