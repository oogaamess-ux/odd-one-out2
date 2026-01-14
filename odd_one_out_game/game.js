document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('grid');
    const targetNumberDisplay = document.getElementById('target-number');
    const timerDisplay = document.getElementById('timer');
    const modal = document.getElementById('game-over-modal');
    const modalTitle = document.getElementById('modal-title');
    const restartBtn = document.getElementById('restart-btn');
    const floatingTextContainer = document.getElementById('floating-text-container');
    const currentScoreDisplay = document.getElementById('current-score');

    // Audio Context for synthetic sounds
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    const COLS = 12;
    const ROWS = 22;
    const TOTAL_CELLS = COLS * ROWS;
    const GAME_DURATION = 30;

    let timeLeft;
    let timerInterval;
    let targetVal;
    let distractorVal;
    let isPlaying = false;
    let score = 0;

    let lastClickTime = 0;
    let comboCount = 0;

    const compliments = ["BRAVO!", "GREAT!", "AWESOME!", "SUPER!", "PERFECT!"];

    // --- Sound Effects ---
    function playSound(type, combo = 0) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'correct') {
            osc.type = 'sine';
            // Base frequency increases with combo
            const baseFreq = 500 + (combo * 100);
            osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, audioCtx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);

            // If combo is high, add a harmony or second tone
            if (combo > 1) {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(baseFreq * 1.5, audioCtx.currentTime); // 5th
                osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, audioCtx.currentTime + 0.1);
                gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.3);
            }

        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'gameover') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 1);
            osc.start();
            osc.stop(audioCtx.currentTime + 1);
        }
    }

    function updateScoreDisplay() {
        if (currentScoreDisplay) {
            currentScoreDisplay.textContent = score;
        }
    }

    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateGameNumbers() {
        let isValid = false;
        let num;

        while (!isValid) {
            num = getRandomNumber(10, 99);
            if (num % 11 === 0) continue;
            if (num % 10 === 0) continue;

            let numStr = num.toString();
            let reverseStr = numStr.split('').reverse().join('');

            if (numStr === reverseStr) continue;

            distractorVal = num;
            targetVal = parseInt(reverseStr);
            isValid = true;
        }
    }

    function updateTimer() {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 5) {
            timerDisplay.classList.add('timer-low');
        } else {
            timerDisplay.classList.remove('timer-low');
        }

        if (timeLeft <= 0) {
            endGame();
        }
    }

    function startGame() {
        score = 0;
        updateScoreDisplay();
        startLevel();

        isPlaying = true;
        modal.classList.add('hidden');

        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
    }

    function startLevel() {
        generateGameNumbers();
        targetNumberDisplay.textContent = targetVal;
        renderGrid();

        timeLeft = GAME_DURATION;
        timerDisplay.textContent = timeLeft;
        timerDisplay.classList.remove('timer-low');
    }

    function endGame() {
        isPlaying = false;
        clearInterval(timerInterval);
        playSound('gameover');

        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            if (parseInt(cell.textContent) === targetVal) {
                cell.classList.add('reveal-target');
            }
        });

        modalTitle.innerText = "Time's Up!";
        let scoreDisplay = document.getElementById('final-score-display');
        if (!scoreDisplay) {
            scoreDisplay = document.createElement('div');
            scoreDisplay.id = 'final-score-display';
            scoreDisplay.className = 'score-text';
            modalTitle.insertAdjacentElement('afterend', scoreDisplay);
        }
        scoreDisplay.textContent = `Total Score: ${score}`;

        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 1500);
    }

    function showFloatingText(isCombo) {
        if (!floatingTextContainer) return;

        let text;
        if (isCombo && comboCount > 1) {
            text = `COMBO x${comboCount}!`;
        } else {
            text = compliments[Math.floor(Math.random() * compliments.length)];
        }

        const el = document.createElement('div');
        el.classList.add('floating-message');
        el.innerText = text;
        el.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 20 - 10}deg)`;

        if (isCombo && comboCount > 1) {
            el.style.color = '#ff0055'; // Special color for combo
            el.style.fontSize = `${3 + (comboCount * 0.2)}rem`; // Get bigger
            el.style.zIndex = 30;
        }

        floatingTextContainer.appendChild(el);

        setTimeout(() => {
            el.remove();
        }, 1000);
    }

    function handleCellClick(e) {
        if (!isPlaying) return;

        const cell = e.target;
        if (!cell.classList.contains('grid-cell')) return;

        const val = parseInt(cell.textContent);
        if (val === targetVal) {
            // Correct
            const now = Date.now();
            // 7 seconds window for combo (generous)
            if (now - lastClickTime < 7000) {
                comboCount++;
            } else {
                comboCount = 1;
            }
            lastClickTime = now;

            playSound('correct', comboCount);
            cell.classList.add('correct');
            score += (1 + Math.floor(comboCount / 2)); // Bonus score for combo?
            updateScoreDisplay();

            showFloatingText(true);

            // Confetti
            if (window.confetti) {
                // More confetti for higher combo
                const particleCount = 30 + (comboCount * 10);
                confetti({
                    particleCount: Math.min(particleCount, 150),
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
                });
            }

            setTimeout(() => {
                startLevel();
            }, 600);
        } else {
            // Wrong
            comboCount = 0; // Reset combo
            playSound('wrong');
            cell.classList.add('shake');
            setTimeout(() => {
                cell.classList.remove('shake');
            }, 400);
        }
    }

    function renderGrid() {
        grid.innerHTML = '';

        const targetIndex = getRandomNumber(0, TOTAL_CELLS - 1);
        const fragment = document.createDocumentFragment();

        // Fixed "light wheat" color as requested
        const levelColor = "#F9E79F"; // Soft, pleasant wheat/yellow
        // Slightly darken body bg to match? Or just grid cells?
        // Let's keep cells colored, maybe change border slightly?

        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');

            cell.style.backgroundColor = levelColor;
            // Adaptive text color based on brightness could be good, but black/dark-grey usually fine for these pastels.
            // Let's force dark text for consistency
            cell.style.color = '#2c3e50';

            if (i === targetIndex) {
                cell.textContent = targetVal;
            } else {
                cell.textContent = distractorVal;
            }

            cell.addEventListener('mousedown', handleCellClick);
            fragment.appendChild(cell);
        }
        grid.appendChild(fragment);
    }

    restartBtn.addEventListener('click', startGame);

    startGame();
});
