const socket = io();

// DOM Elements
const statusText = document.getElementById('connection-status');
const pinInput = document.getElementById('pin-input');
const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');

const joinSection = document.getElementById('join-section');
const waitingSection = document.getElementById('waiting-section');
const controllerSection = document.getElementById('controller-section');
const gameoverSection = document.getElementById('gameover-section');

const waitingTitle = document.getElementById('waiting-title');
const waitingSubtitle = document.getElementById('waiting-subtitle');
const waitingScore = document.getElementById('waiting-score');
const waitingIcon = document.getElementById('waiting-icon');
const streakBadge = document.getElementById('streak-badge');
const streakCount = document.getElementById('streak-count');

const playerReconnectBadge = document.getElementById('player-reconnect-badge');
const playerQuestionBadge = document.getElementById('player-question-badge');
const playerSoundBtn = document.getElementById('player-sound-btn');
const playerSoundIcon = document.getElementById('player-sound-icon');
const leaveGameBtn = document.getElementById('leave-game-btn');
const playerNotification = document.getElementById('player-notification');
const notificationText = document.getElementById('notification-text');

// Report Card Elements
const reportRankBadge = document.getElementById('report-rank-badge');
const reportTitle = document.getElementById('report-title');
const reportScoreVal = document.getElementById('report-score-val');
const reportAccuracyVal = document.getElementById('report-accuracy-val');
const reportCorrectVal = document.getElementById('report-correct-val');
const reportStreakVal = document.getElementById('report-streak-val');
const podiumSummaryList = document.getElementById('podium-summary-list');
const playAgainBtn = document.getElementById('play-again-btn');

const ctrlButtons = document.querySelectorAll('.ctrl-btn');
const avatarOptions = document.querySelectorAll('.avatar-option');

let selectedAvatar = document.querySelector('.avatar-option.selected').innerHTML;
let selectedColor = document.querySelector('.avatar-option.selected').getAttribute('data-color');

let currentPin = '';
let currentToken = null;
let hasAnsweredCurrent = false;

// === Auto-Fill PIN from Query String ===
const urlParams = new URLSearchParams(window.location.search);
const urlPin = urlParams.get('pin');
if (urlPin) {
    pinInput.value = urlPin;
}

// === Sound Toggle Setup ===
function updateSoundIcon() {
    if (window.soundEngine && window.soundEngine.isMuted()) {
        playerSoundIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    } else {
        playerSoundIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
    }
}
updateSoundIcon();

playerSoundBtn.addEventListener('click', () => {
    if (window.soundEngine) {
        window.soundEngine.init();
        window.soundEngine.toggleMute();
        updateSoundIcon();
    }
});

// Resume AudioContext on first tap
['click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (window.soundEngine) window.soundEngine.init();
    }, { once: true });
});

function showPlayerNotification(msg, duration = 4000) {
    notificationText.innerText = msg;
    playerNotification.classList.remove('hidden');
    setTimeout(() => {
        playerNotification.classList.add('hidden');
    }, duration);
}

// Helper to switch player views
function showPlayerScreen(screen) {
    joinSection.classList.add('hidden');
    waitingSection.classList.add('hidden');
    controllerSection.classList.add('hidden');
    gameoverSection.classList.add('hidden');

    if (screen === 'join') {
        joinSection.classList.remove('hidden');
        playerQuestionBadge.classList.add('hidden');
    } else if (screen === 'waiting') {
        waitingSection.classList.remove('hidden');
    } else if (screen === 'controller') {
        controllerSection.classList.remove('hidden');
    } else if (screen === 'gameover') {
        gameoverSection.classList.remove('hidden');
        playerQuestionBadge.classList.add('hidden');
    }
}

// === Socket Connection & Reconnection Logic ===
socket.on('connect', () => {
    statusText.innerText = 'Connected to Server!';
    statusText.style.color = '#26890c';

    pinInput.disabled = false;
    nameInput.disabled = false;
    joinBtn.disabled = false;

    // Check for saved session in sessionStorage
    const saved = sessionStorage.getItem('bb_player_session');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.pin && data.token) {
                currentPin = data.pin;
                currentToken = data.token;
                playerReconnectBadge.classList.remove('hidden');
                playerReconnectBadge.innerText = 'Restoring Session...';
                socket.emit('playerReconnect', { pin: data.pin, token: data.token });
                return;
            }
        } catch (e) {
            sessionStorage.removeItem('bb_player_session');
        }
    }
});

// Join Button
joinBtn.addEventListener('click', () => {
    const pin = pinInput.value.trim();
    const name = nameInput.value.trim();

    if (pin && name) {
        joinBtn.disabled = true;
        joinBtn.innerText = 'Joining...';
        currentPin = pin;
        socket.emit('playerJoinGame', { pin, name, avatar: selectedAvatar, color: selectedColor });
    } else {
        statusText.innerText = 'Please enter a PIN and Nickname.';
        statusText.style.color = '#eb2754';
    }
});

// Join Success
socket.on('joinSuccess', (data) => {
    currentToken = data.token;
    currentPin = data.pin;

    sessionStorage.setItem('bb_player_session', JSON.stringify({
        pin: data.pin,
        token: data.token,
        name: data.name,
        avatar: data.avatar,
        color: data.color
    }));

    showPlayerScreen('waiting');
    waitingSection.style.backgroundColor = '#26890c';

    waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><path d="M20 33L28 41L44 23" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    waitingTitle.innerText = `You're in, ${data.name}!`;
    waitingSubtitle.innerText = 'Look at the big screen.';
    waitingScore.innerText = '';
    streakBadge.classList.add('hidden');
});

// Join Error
socket.on('joinError', (data) => {
    statusText.innerText = data.message;
    statusText.style.color = '#eb2754';
    joinBtn.disabled = false;
    joinBtn.innerText = 'Enter';
});

// Player Kicked by Host
socket.on('playerKicked', (data) => {
    sessionStorage.removeItem('bb_player_session');
    currentPin = '';
    currentToken = null;

    showPlayerScreen('join');
    joinBtn.disabled = false;
    joinBtn.innerText = 'Enter';

    showPlayerNotification(data.message || 'You were kicked from the game by the host.');

    if (window.soundEngine) {
        window.soundEngine.playIncorrect();
        window.soundEngine.triggerHaptic('incorrect');
    }
});

// Reconnection Restored
socket.on('playerStateRestored', (data) => {
    playerReconnectBadge.innerText = 'Session Restored!';
    setTimeout(() => playerReconnectBadge.classList.add('hidden'), 3500);

    currentPin = data.pin;
    currentToken = data.token;
    hasAnsweredCurrent = data.hasAnswered;

    if (data.gameState === 'lobby') {
        showPlayerScreen('waiting');
        waitingSection.style.backgroundColor = '#26890c';
        waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><path d="M20 33L28 41L44 23" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        waitingTitle.innerText = `You're in, ${data.player.name}!`;
        waitingSubtitle.innerText = 'Waiting for host to start...';
        waitingScore.innerText = `Score: ${data.player.score}`;
    } else if (data.gameState === 'playing') {
        if (data.hasAnswered) {
            showPlayerScreen('waiting');
            waitingSection.style.backgroundColor = '#46178f';
            waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><polygon points="34 8 18 36 30 36 28 56 46 28 34 28 34 8" fill="#FFFFFF"/></svg>`;
            waitingTitle.innerText = 'Answer Sent!';
            waitingSubtitle.innerText = 'Waiting for others...';
            waitingScore.innerText = `Score: ${data.player.score}`;
        } else {
            // Restore controller with answer texts if provided
            if (data.answerLabels) {
                for (let i = 0; i < 4; i++) {
                    const txtSpan = document.getElementById(`ctrl-text-${i}`);
                    if (txtSpan) txtSpan.innerText = data.answerLabels[i] || '';
                }
            }
            showPlayerScreen('controller');
        }
    } else if (data.gameState === 'questionResults') {
        showPlayerScreen('waiting');
        waitingSection.style.backgroundColor = data.isCorrect ? '#26890c' : '#eb2754';
        waitingIcon.innerHTML = data.isCorrect
            ? `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><path d="M20 33L28 41L44 23" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><line x1="22" y1="22" x2="42" y2="42" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/><line x1="42" y1="22" x2="22" y2="42" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/></svg>`;
        waitingTitle.innerText = data.isCorrect ? 'Correct!' : 'Incorrect';
        waitingSubtitle.innerText = data.isCorrect ? `+${data.lastPoints} Points!` : 'Better luck next question!';
        waitingScore.innerText = `Score: ${data.player.score}`;
    } else if (data.gameState === 'scoreboard') {
        showPlayerScreen('waiting');
        waitingSection.style.backgroundColor = '#46178f';
        waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><rect x="18" y="32" width="6" height="16" rx="2" fill="#FFFFFF"/><rect x="29" y="22" width="6" height="26" rx="2" fill="#FFFFFF"/><rect x="40" y="27" width="6" height="21" rx="2" fill="#FFFFFF"/></svg>`;
        waitingTitle.innerText = 'Check the Scoreboard!';
        waitingSubtitle.innerText = `Your Score: ${data.player.score}`;
        waitingScore.innerText = '';
    }
});

// Reconnection Error
socket.on('playerReconnectError', () => {
    playerReconnectBadge.classList.add('hidden');
    sessionStorage.removeItem('bb_player_session');
    showPlayerScreen('join');
});

// Avatar selection
avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedAvatar = option.innerHTML;
        selectedColor = option.getAttribute('data-color');
    });
});

// Show Controller on new question
socket.on('showController', (data) => {
    hasAnsweredCurrent = false;

    // Update Question progress badge
    if (data && data.questionIndex !== undefined) {
        playerQuestionBadge.classList.remove('hidden');
        playerQuestionBadge.innerText = `Q ${data.questionIndex + 1} / ${data.totalQuestions || 5}`;
    }

    // If answers provided (showAnswersOnDevice setting enabled), populate text inside buttons
    if (data && data.answers && Array.isArray(data.answers)) {
        for (let i = 0; i < 4; i++) {
            const txt = document.getElementById(`ctrl-text-${i}`);
            if (txt) {
                txt.innerText = data.answers[i] || '';
                txt.classList.remove('hidden');
            }
        }
    } else {
        // Shapes only mode
        for (let i = 0; i < 4; i++) {
            const txt = document.getElementById(`ctrl-text-${i}`);
            if (txt) {
                txt.innerText = '';
                txt.classList.add('hidden');
            }
        }
    }

    showPlayerScreen('controller');

    // Subtle vibration buzz to alert player that question opened
    if (window.soundEngine) {
        window.soundEngine.triggerHaptic('tap');
    }
});

// Handle Answer submission
ctrlButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (hasAnsweredCurrent) return;
        hasAnsweredCurrent = true;

        const index = parseInt(e.currentTarget.getAttribute('data-index'));

        // Play feedback
        if (window.soundEngine) {
            window.soundEngine.playAnswerClick();
            window.soundEngine.triggerHaptic('tap');
        }

        socket.emit('submitAnswer', { pin: currentPin, answerIndex: index });
    });
});

// Answer acknowledged by server
socket.on('answerReceived', () => {
    showPlayerScreen('waiting');
    waitingSection.style.backgroundColor = '#46178f';

    waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><polygon points="34 8 18 36 30 36 28 56 46 28 34 28 34 8" fill="#FFFFFF"/></svg>`;
    waitingTitle.innerText = 'Answer Sent!';
    waitingSubtitle.innerText = 'Waiting for time to run out...';
    waitingScore.innerText = '';
    streakBadge.classList.add('hidden');
});

// Question Results
socket.on('questionResult', (data) => {
    showPlayerScreen('waiting');
    waitingSection.style.backgroundColor = data.color;

    if (data.isCorrect) {
        waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><path d="M20 33L28 41L44 23" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        waitingTitle.innerText = data.message || 'Correct!';
        waitingSubtitle.innerText = `+${data.points.toLocaleString()} Points!`;

        if (window.soundEngine) {
            window.soundEngine.playCorrect();
            window.soundEngine.triggerHaptic('correct');
        }

        // Streak badge
        if (data.streak >= 2) {
            streakBadge.classList.remove('hidden');
            streakCount.innerText = data.streak;
        } else {
            streakBadge.classList.add('hidden');
        }
    } else {
        waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><line x1="22" y1="22" x2="42" y2="42" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/><line x1="42" y1="22" x2="22" y2="42" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/></svg>`;
        waitingTitle.innerText = data.message || 'Incorrect';
        waitingSubtitle.innerText = 'Better luck next question!';
        streakBadge.classList.add('hidden');

        if (window.soundEngine) {
            window.soundEngine.playIncorrect();
            window.soundEngine.triggerHaptic('incorrect');
        }
    }

    waitingScore.innerText = `Total: ${data.score.toLocaleString()} pts`;
});

// Generic Waiting Screen (Scoreboard / Transitions)
socket.on('showWaitingScreen', (data) => {
    showPlayerScreen('waiting');
    waitingSection.style.backgroundColor = data.color || '#46178f';

    waitingIcon.innerHTML = `<svg viewBox="0 0 64 64" width="60" height="60" fill="none"><circle cx="32" cy="32" r="28" fill="#FFFFFF" fill-opacity="0.25"/><rect x="14" y="16" width="36" height="26" rx="4" stroke="#FFFFFF" stroke-width="4"/><line x1="26" y1="48" x2="38" y2="48" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><line x1="32" y1="42" x2="32" y2="48" stroke="#FFFFFF" stroke-width="4"/></svg>`;
    waitingTitle.innerText = data.message || 'Look at the Big Screen!';
    waitingSubtitle.innerText = '';
    waitingScore.innerText = '';
    streakBadge.classList.add('hidden');
});

// Game Over Celebration & Report Card for Player
socket.on('showGameOverPlayer', (report) => {
    showPlayerScreen('gameover');

    const { rank, totalPlayers, score, correctCount, totalQuestions, accuracyPct, maxStreak, top3 } = report;

    const rankIconWrap = document.getElementById('report-rank-icon');
    const rankTextWrap = document.getElementById('report-rank-text');

    // Rank Badge and Title
    if (rank === 1) {
        if (rankIconWrap) rankIconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#1e053a"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34c3.34-.86 5-3.88 5-6.66V4H5v4c0 2.78 1.66 5.8 5 6.66z"/></svg>`;
        if (rankTextWrap) rankTextWrap.innerText = '1st Place';
        reportRankBadge.style.background = '#f2ce46';
        reportRankBadge.style.color = '#1e053a';
        reportTitle.innerText = 'Trivia Champion!';
    } else if (rank === 2) {
        if (rankIconWrap) rankIconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" fill="#e0e0e0"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#1e053a"/></svg>`;
        if (rankTextWrap) rankTextWrap.innerText = '2nd Place';
        reportRankBadge.style.background = '#e0e0e0';
        reportRankBadge.style.color = '#1e053a';
        reportTitle.innerText = 'Runner-Up Master!';
    } else if (rank === 3) {
        if (rankIconWrap) rankIconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" fill="#e67e22"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#ffffff"/></svg>`;
        if (rankTextWrap) rankTextWrap.innerText = '3rd Place';
        reportRankBadge.style.background = '#e67e22';
        reportRankBadge.style.color = 'white';
        reportTitle.innerText = 'Podium Finisher!';
    } else {
        if (rankIconWrap) rankIconWrap.innerHTML = '';
        if (rankTextWrap) rankTextWrap.innerText = `Rank #${rank} of ${totalPlayers}`;
        reportRankBadge.style.background = '#46178f';
        reportRankBadge.style.color = 'white';
        reportTitle.innerText = 'Great Effort!';
    }

    reportScoreVal.innerText = `${score.toLocaleString()} pts`;
    reportAccuracyVal.innerText = `${accuracyPct}%`;
    reportCorrectVal.innerText = `${correctCount} / ${totalQuestions}`;

    const streakNumSpan = document.getElementById('report-streak-num');
    if (streakNumSpan) {
        streakNumSpan.innerText = maxStreak;
    } else {
        reportStreakVal.innerText = maxStreak;
    }

    // Top 3 Podium Summary
    podiumSummaryList.innerHTML = '';
    if (top3 && Array.isArray(top3)) {
        const medalSVGs = [
            `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" style="vertical-align: middle; margin-right: 6px;"><circle cx="12" cy="12" r="10" fill="#f2ce46"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#1e053a"/></svg>`,
            `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" style="vertical-align: middle; margin-right: 6px;"><circle cx="12" cy="12" r="10" fill="#e0e0e0"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#1e053a"/></svg>`,
            `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" style="vertical-align: middle; margin-right: 6px;"><circle cx="12" cy="12" r="10" fill="#e67e22"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#ffffff"/></svg>`
        ];

        top3.forEach((tp, i) => {
            const row = document.createElement('div');
            row.className = 'podium-summary-row';
            row.innerHTML = `
                <span style="display: inline-flex; align-items: center;">${medalSVGs[i] || `#${i + 1} `} <span>${tp.name}</span></span>
                <span style="color: #46178f; font-weight: 800;">${tp.score.toLocaleString()} pts</span>
            `;
            podiumSummaryList.appendChild(row);
        });
    }

    // Audio & Haptic celebration
    if (window.soundEngine) {
        if (rank <= 3) {
            window.soundEngine.playGameOverCelebration();
            window.soundEngine.triggerHaptic('correct');
        } else {
            window.soundEngine.playScoreboardFanfare();
        }
    }
});

// Leave Game
leaveGameBtn.addEventListener('click', () => {
    sessionStorage.removeItem('bb_player_session');
    window.location.reload();
});

// Play Again Button
if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
        sessionStorage.removeItem('bb_player_session');
        window.location.reload();
    });
}
