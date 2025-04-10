document.addEventListener('DOMContentLoaded', function() {
    // game state
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    let guessCount = 0;
    let feedbackHistory = [];
    let currentWord = '';
    let wordSuggestion = '';
    let isLoading = false;

    // theme state
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
    
    themeToggle.addEventListener('click', function() {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.add('dark-mode');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });

    // dom elements
    const currentWordDisplay = document.getElementById('current-word');
    const feedbackInput = document.getElementById('feedback-input');
    const submitFeedbackButton = document.getElementById('submit-feedback');
    const guessHistoryContainer = document.getElementById('guess-history');
    const suggestionElement = document.getElementById('suggestion');
    const remainingCountElement = document.getElementById('remaining-count');
    const possibleWordsElement = document.getElementById('possible-words');
    const useSuggestionButton = document.getElementById('use-suggestion');
    const newGameButton = document.getElementById('new-game');
    const helpButton = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const foundWordButton = document.getElementById('found-word');
    const successModal = document.getElementById('success-modal');
    const successWord = document.getElementById('success-word');
    const successGuesses = document.getElementById('success-guesses');
    const shareResultsButton = document.getElementById('share-results');
    const playAgainButton = document.getElementById('play-again');
    const confettiCanvas = document.getElementById('confetti-canvas');

    // modal setup
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');

    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    if (successModal) {
        const successCloseButton = successModal.querySelector('.close');
        if (successCloseButton) {
            successCloseButton.addEventListener('click', function() {
                successModal.style.display = 'none';
            });
        }
    }

    // background animation setup
    const backgroundCanvas = document.getElementById('background-canvas');
    const ctx = backgroundCanvas.getContext('2d');
    
    function resizeCanvas() {
        backgroundCanvas.width = window.innerWidth;
        backgroundCanvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fallingLetters = [];
    
    function createLetters(count = 150) {
        for (let i = 0; i < count; i++) {
            const letter = letters[Math.floor(Math.random() * letters.length)];
            fallingLetters.push({
                letter: letter,
                x: Math.random() * backgroundCanvas.width,
                y: Math.random() * backgroundCanvas.height * 2 - backgroundCanvas.height,
                size: Math.random() * 25 + 25,
                speed: Math.random() * 1.5 + 0.5,
                color: '#000000',
                opacity: Math.random() * 0.3 + 0.5
            });
        }
    }
    
    function drawLetter(letterObj) {
        ctx.font = `bold ${letterObj.size}px Arial`;
        ctx.fillStyle = letterObj.color;
        ctx.globalAlpha = letterObj.opacity;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(letterObj.letter, letterObj.x, letterObj.y);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 1;
    }
    
    function updateLetters() {
        ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        
        fallingLetters.forEach((letterObj, index) => {
            letterObj.y += letterObj.speed;
            
            if (letterObj.y > backgroundCanvas.height) {
                letterObj.y = -30;
                letterObj.x = Math.random() * backgroundCanvas.width;
                letterObj.letter = letters[Math.floor(Math.random() * letters.length)];
            }
            
            drawLetter(letterObj);
        });
        
        requestAnimationFrame(updateLetters);
    }
    
    createLetters();
    updateLetters();

    initializeGame();

    // event listeners
    if (newGameButton) {
        newGameButton.addEventListener('click', function() {
            startNewGame();
            showMessage('Starting new game...');
        });
    }

    if (helpButton) {
        helpButton.addEventListener('click', function() {
            if (helpModal) {
                helpModal.style.display = 'block';
            }
        });
    }

    if (foundWordButton) {
        foundWordButton.addEventListener('click', function() {
            celebrateSuccess();
            showMessage('🎉 Congratulations! You found the word!');
        });
    }

    if (submitFeedbackButton) {
        submitFeedbackButton.addEventListener('click', handleFeedbackSubmit);
    }

    if (feedbackInput) {
        feedbackInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleFeedbackSubmit();
            }
        });
    }

    if (shareResultsButton) {
        shareResultsButton.addEventListener('click', shareResults);
    }

    if (playAgainButton) {
        playAgainButton.addEventListener('click', function() {
            if (successModal) {
                successModal.style.display = 'none';
            }
            startNewGame();
        });
    }

    function celebrateSuccess() {
        successWord.textContent = currentWord || wordSuggestion;
        successGuesses.textContent = guessCount;
        
        if (successModal) {
            successModal.style.display = 'block';
            
            const successCloseBtn = successModal.querySelector('.close');
            if (successCloseBtn) {
                successCloseBtn.classList.add('success-close');
                successCloseBtn.onclick = function() {
                    successModal.style.display = 'none';
                };
            }
        }
        
        if (confettiCanvas) {
            confettiCanvas.style.display = 'block';
            fireConfetti();
        }
    }
    
    function fireConfetti() {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 1100
        };
        
        function fire(particleRatio, opts) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }
        
        fire(0.25, {
            spread: 26,
            startVelocity: 55,
            origin: { x: 0.2, y: 0.7 }
        });
        fire(0.5, {
            spread: 60,
            origin: { x: 0.5, y: 0.7 }
        });
        fire(0.25, {
            spread: 26,
            startVelocity: 55,
            origin: { x: 0.8, y: 0.7 }
        });
        
        setTimeout(() => {
            confettiCanvas.style.display = 'none';
        }, 5000);
    }
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    function shareResults() {
        const guessPatterns = feedbackHistory.map(entry => {
            return entry.feedback.split('').map(num => {
                if (num === '2') return '🟩';
                if (num === '1') return '🟨';
                return '⬜';
            }).join('');
        });
        
        const shareText = `Wordle Assistant\n${guessCount}/6\n\n${guessPatterns.join('\n')}`;
        
        navigator.clipboard.writeText(shareText).then(() => {
            showMessage('Results copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            showMessage('Unable to copy automatically. Please copy the text from the modal.');
            alert(shareText);
        });
    }

    function showMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            messageElement.classList.remove('show');
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        }, 3000);
    }

    function startNewGame() {
        guessCount = 0;
        feedbackHistory = [];
        currentWord = '';
        wordSuggestion = '';
        isLoading = false;
        
        currentWordDisplay.textContent = '';
        feedbackInput.value = '';
        guessHistoryContainer.innerHTML = '';
        possibleWordsElement.innerHTML = '';
        remainingCountElement.textContent = '0';
        suggestionElement.textContent = 'Loading...';
        
        getWordSuggestion();
        showMessage('Starting new game...');
    }

    function initializeGame() {
        getWordSuggestion();
    }

    function handleFeedbackSubmit() {
        const feedback = feedbackInput.value.trim();
        
        if (!feedback.match(/^[012]{5}$/)) {
            showMessage('Please enter exactly 5 digits (0, 1, or 2).');
            return;
        }
        
        addToHistory(currentWord, feedback);
        feedbackInput.value = '';
        processFeedback(currentWord, feedback);
        
        if (feedback === '22222') {
            celebrateSuccess();
        }
    }

    function addToHistory(word, feedback) {
        const historyEntry = document.createElement('div');
        historyEntry.classList.add('history-entry');
        
        const wordSpan = document.createElement('div');
        wordSpan.classList.add('history-word');
        wordSpan.textContent = word;
        historyEntry.appendChild(wordSpan);
        
        const feedbackDiv = document.createElement('div');
        feedbackDiv.classList.add('history-feedback');
        
        for (let i = 0; i < feedback.length; i++) {
            const circle = document.createElement('div');
            circle.classList.add('feedback-circle');
            
            if (feedback[i] === '2') {
                circle.classList.add('correct');
                circle.textContent = '2';
            } else if (feedback[i] === '1') {
                circle.classList.add('present');
                circle.textContent = '1';
            } else {
                circle.classList.add('absent');
                circle.textContent = '0';
            }
            
            feedbackDiv.appendChild(circle);
        }
        
        historyEntry.appendChild(feedbackDiv);
        guessHistoryContainer.appendChild(historyEntry);
    }

    function processFeedback(word, feedback) {
        feedbackHistory.push({
            word: word,
            feedback: feedback
        });
        
        guessCount++;
        
        if (feedback === '22222') {
            showMessage('Congratulations! You solved the puzzle!');
            return;
        } else if (guessCount >= MAX_GUESSES) {
            showMessage('Game over! You used all your guesses.');
            currentWordDisplay.textContent = '';
            return;
        }
        
        getWordSuggestion();
    }

    function getWordSuggestion() {
        if (isLoading) return;
        isLoading = true;
        
        suggestionElement.textContent = "Loading...";
        
        fetch('/api/get_suggestion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                feedbackHistory: feedbackHistory
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Error getting word suggestion');
                });
            }
            return response.json();
        })
        .then(data => {
            isLoading = false;
            wordSuggestion = data.suggestion;
            currentWord = wordSuggestion;
            
            suggestionElement.textContent = wordSuggestion;
            currentWordDisplay.textContent = wordSuggestion;
            remainingCountElement.textContent = data.remainingCount;
            
            possibleWordsElement.innerHTML = '';
            data.possibleWords.forEach(word => {
                const wordElement = document.createElement('div');
                wordElement.classList.add('possible-word');
                wordElement.textContent = word;
                possibleWordsElement.appendChild(wordElement);
            });
        })
        .catch(error => {
            console.error('Error getting word suggestion:', error);
            isLoading = false;
            showMessage(error.message || 'Error getting word suggestion. Please try again.');
            
            if (error.message && error.message.includes('No words match')) {
                setTimeout(() => {
                    showMessage('Starting a new game due to invalid feedback...');
                    startNewGame();
                }, 2000);
            }
        });
    }

    function useWordSuggestion() {
        currentWord = wordSuggestion;
        currentWordDisplay.textContent = currentWord;
    }
});
