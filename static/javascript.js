document.addEventListener('DOMContentLoaded', function() {
    // Game state
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    let guessCount = 0;
    let feedbackHistory = [];
    let currentWord = '';
    let aiSuggestion = '';
    let isLoading = false;

    // Theme state
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
    
    // Theme toggle event listener
    themeToggle.addEventListener('click', function() {
        if (document.body.classList.contains('dark-mode')) {
            // Switch to light mode
            document.body.classList.remove('dark-mode');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            // Switch to dark mode
            document.body.classList.add('dark-mode');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Game elements
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
    const closeModalButtons = document.querySelectorAll('.close');
    const confettiCanvas = document.getElementById('confetti-canvas');

    // Background letter waterfall effect
    const backgroundCanvas = document.getElementById('background-canvas');
    const ctx = backgroundCanvas.getContext('2d');
    
    // Set canvas dimensions
    function resizeCanvas() {
        backgroundCanvas.width = window.innerWidth;
        backgroundCanvas.height = window.innerHeight;
    }
    
    // Initialize resize and add event listener
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Letters for the waterfall
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Letter objects array
    const fallingLetters = [];
    
    // Create initial letters
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
    
    // Draw a single letter
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
    
    // Update and draw all letters
    function updateLetters() {
        ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        
        fallingLetters.forEach((letterObj, index) => {
            // Update position
            letterObj.y += letterObj.speed;
            
            // If letter is out of screen, reset it
            if (letterObj.y > backgroundCanvas.height) {
                letterObj.y = -30;
                letterObj.x = Math.random() * backgroundCanvas.width;
                letterObj.letter = letters[Math.floor(Math.random() * letters.length)];
            }
            
            // Draw the letter
            drawLetter(letterObj);
        });
        
        // Continue animation
        requestAnimationFrame(updateLetters);
    }
    
    // Start the waterfall animation
    createLetters();
    updateLetters();

    // Initialize game
    initializeGame();

    // Event Listeners for Control Buttons
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

    // Event Listeners for Game Actions
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

    // Modal Event Listeners
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

    // Close modal buttons
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Click outside modal to close
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Initialize the game
    function initializeGame() {
        getAiSuggestion();
    }

    // Handle feedback submission
    function handleFeedbackSubmit() {
        const feedback = feedbackInput.value.trim();
        
        // Validate feedback
        if (!feedback.match(/^[012]{5}$/)) {
            showMessage('Please enter exactly 5 digits (0, 1, or 2).');
            return;
        }
        
        // Add to history
        addToHistory(currentWord, feedback);
        
        // Clear the input field
        feedbackInput.value = '';
        
        // Process feedback
        processFeedback(currentWord, feedback);
        
        // If all 2's, show celebration
        if (feedback === '22222') {
            celebrateSuccess();
        }
    }

    // Add guess and feedback to history
    function addToHistory(word, feedback) {
        // Create history entry
        const historyEntry = document.createElement('div');
        historyEntry.classList.add('history-entry');
        
        // Add word
        const wordSpan = document.createElement('div');
        wordSpan.classList.add('history-word');
        wordSpan.textContent = word;
        historyEntry.appendChild(wordSpan);
        
        // Add feedback circles
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
        
        // Add to container
        guessHistoryContainer.appendChild(historyEntry);
    }

    // Process feedback after submission
    function processFeedback(word, feedback) {
        // Add to feedback history
        feedbackHistory.push({
            word: word,
            feedback: feedback
        });
        
        // Increment guess count
        guessCount++;
        
        // Check if game is over
        if (feedback === '22222') {
            showMessage('Congratulations! You solved the puzzle!');
            return;
        } else if (guessCount >= MAX_GUESSES) {
            showMessage('Game over! You used all your guesses.');
            currentWordDisplay.textContent = '';
            return;
        }
        
        // Get next AI suggestion
        getAiSuggestion();
    }

    // Get AI suggestion from the backend
    function getAiSuggestion() {
        // Prevent multiple simultaneous API calls
        if (isLoading) return;
        isLoading = true;
        
        // Show loading state
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
                    throw new Error(data.message || 'Error getting AI suggestion');
                });
            }
            return response.json();
        })
        .then(data => {
            isLoading = false;
            aiSuggestion = data.suggestion;
            currentWord = aiSuggestion;
            
            // Update the UI
            suggestionElement.textContent = aiSuggestion;
            currentWordDisplay.textContent = aiSuggestion;
            remainingCountElement.textContent = data.remainingCount;
            
            // Display possible words
            possibleWordsElement.innerHTML = '';
            data.possibleWords.forEach(word => {
                const wordElement = document.createElement('div');
                wordElement.classList.add('possible-word');
                wordElement.textContent = word;
                possibleWordsElement.appendChild(wordElement);
            });
        })
        .catch(error => {
            console.error('Error getting AI suggestion:', error);
            isLoading = false;
            showMessage(error.message || 'Error getting AI suggestion. Please try again.');
            
            // If no words match, start a new game
            if (error.message && error.message.includes('No words match')) {
                setTimeout(() => {
                    showMessage('Starting a new game due to invalid feedback...');
                    startNewGame();
                }, 2000);
            }
        });
    }

    // Use the AI suggestion
    function useAiSuggestion() {
        currentWord = aiSuggestion;
        currentWordDisplay.textContent = currentWord;
    }
    
    // Celebrate success with confetti and modal
    function celebrateSuccess() {
        // Update success modal content
        successWord.textContent = currentWord || aiSuggestion;
        successGuesses.textContent = guessCount;
        
        // Show the success modal
        if (successModal) {
            successModal.style.display = 'block';
        }
        
        // Show confetti
        if (confettiCanvas) {
            confettiCanvas.style.display = 'block';
            fireConfetti();
        }
        
        // Show celebration message
    }
    
    // Fire confetti animation
    function fireConfetti() {
        // Configure and fire confetti
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
        
        // Fire confetti from left, middle and right
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
        
        // Hide canvas after animation completes
        setTimeout(() => {
            confettiCanvas.style.display = 'none';
        }, 5000);
    }
    
    // Share results
    function shareResults() {
        const guessPatterns = feedbackHistory.map(entry => {
            return entry.feedback.split('').map(num => {
                if (num === '2') return '🟩';  // Green
                if (num === '1') return '🟨';  // Yellow
                return '⬜';  // Gray
            }).join('');
        });
        
        const shareText = `Wordle Assistant\n${guessCount}/6\n\n${guessPatterns.join('\n')}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showMessage('Results copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            // Fallback
            showMessage('Unable to copy automatically. Please copy the text from the modal.');
            alert(shareText);
        });
    }

    // Show a message to the user
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

    // Start a new game
    function startNewGame() {
        // Reset game state
        guessCount = 0;
        feedbackHistory = [];
        currentWord = '';
        aiSuggestion = '';
        isLoading = false;
        
        // Clear UI
        currentWordDisplay.textContent = '';
        feedbackInput.value = '';
        guessHistoryContainer.innerHTML = '';
        possibleWordsElement.innerHTML = '';
        remainingCountElement.textContent = '0';
        suggestionElement.textContent = 'Loading...';
        
        // Get new AI suggestion
        getAiSuggestion();
        
        // Show message
    }
});
