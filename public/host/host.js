const socket = io();

// DOM elements
const statusText = document.getElementById('connection-status');
const startBtn = document.getElementById('start-game-btn');
const playerCountSpan = document.getElementById('player-count');
const playerList = document.getElementById('player-list');
const timerDisplay = document.getElementById('timer-display');
const answersReceivedDisplay = document.getElementById('answers-received');
const totalAnswersNeededDisplay = document.getElementById('total-answers-needed');
const answersProgressBar = document.getElementById('answers-progress-bar');
const nextBtn = document.getElementById('next-btn');
const scoreboardNextBtn = document.getElementById('scoreboard-next-btn');
const newGameBtn = document.getElementById('new-game-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundIcon = document.getElementById('sound-icon');
const soundLabel = document.getElementById('sound-label');
const reconnectBadge = document.getElementById('reconnect-badge');
const questionProgress = document.getElementById('question-progress');
const quizActiveTitleBadge = document.getElementById('quiz-active-title');
const playerLink = document.getElementById('player-link');

// QR elements
const qrCard = document.getElementById('qr-card');
const qrCodeImg = document.getElementById('qr-code-img');
const qrModal = document.getElementById('qr-modal');
const qrModalImg = document.getElementById('qr-modal-img');
const qrModalPin = document.getElementById('qr-modal-pin');
const closeQrModalBtn = document.getElementById('close-qr-modal');

// Settings elements
const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
const settingsDrawer = document.getElementById('settings-drawer');
const timerSegmentButtons = document.querySelectorAll('#timer-segments .segment-btn');
const shuffleQuestionsToggle = document.getElementById('shuffle-questions-toggle');
const shuffleAnswersToggle = document.getElementById('shuffle-answers-toggle');
const streakBonusToggle = document.getElementById('streak-bonus-toggle');
const showAnswersDeviceToggle = document.getElementById('show-answers-device-toggle');

// Quiz Management elements
const quizPackSelect = document.getElementById('quiz-pack-select');
const openQuizBuilderBtn = document.getElementById('open-quiz-builder-btn');
const quizQCountSpan = document.getElementById('quiz-q-count');
const quizBuilderModal = document.getElementById('quiz-builder-modal');
const closeQuizBuilderBtn = document.getElementById('close-quiz-builder');
const discardQuizBtn = document.getElementById('discard-quiz-btn');
const saveQuizBtn = document.getElementById('save-quiz-btn');
const customQuizTitleInput = document.getElementById('custom-quiz-title-input');
const builderQCountSpan = document.getElementById('builder-q-count');
const builderQuestionsList = document.getElementById('builder-questions-list');
const toggleJsonDrawerBtn = document.getElementById('toggle-json-drawer-btn');
const jsonDrawer = document.getElementById('json-drawer');
const jsonTextarea = document.getElementById('json-textarea');
const applyJsonBtn = document.getElementById('apply-json-btn');
const exportJsonBtn = document.getElementById('export-json-btn');

// Add/Edit question form
const formModeTitle = document.getElementById('form-mode-title');
const newQTextInput = document.getElementById('new-q-text');
const newAns0Input = document.getElementById('new-ans-0');
const newAns1Input = document.getElementById('new-ans-1');
const newAns2Input = document.getElementById('new-ans-2');
const newAns3Input = document.getElementById('new-ans-3');
const saveQuestionBtn = document.getElementById('save-question-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Analytics elements
const analyticsPanel = document.getElementById('analytics-panel');
const accuracyStat = document.getElementById('accuracy-stat');
const fastestStat = document.getElementById('fastest-stat');

// Game state variables
let currentPin = null;
let currentHostToken = null;
let allPlayers = [];
let currentQuiz = {
    id: 'general',
    title: 'General Knowledge & Trivia',
    questions: []
};
let draftQuestions = [];
let editingQuestionIndex = -1;
let currentSettings = {
    questionTimer: 20,
    shuffleQuestions: false,
    shuffleAnswers: false,
    streakBonus: true,
    showAnswersOnDevice: true
};

// === Sound Toggle Setup ===
function updateSoundButton() {
    if (window.soundEngine && window.soundEngine.isMuted()) {
        soundIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
        soundLabel.innerText = 'Muted';
    } else {
        soundIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
        soundLabel.innerText = 'Sound On';
    }
}
updateSoundButton();

soundToggleBtn.addEventListener('click', () => {
    if (window.soundEngine) {
        window.soundEngine.init();
        window.soundEngine.toggleMute();
        updateSoundButton();
    }
});

// Resume Audio Context on first interaction
['click', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (window.soundEngine) window.soundEngine.init();
    }, { once: true });
});

// === Socket Connection & Initialization ===
socket.on('connect', () => {
    statusText.innerText = 'Connected to Server!';
    statusText.style.color = '#a8ff78';

    // Check for saved host session in sessionStorage
    const savedSession = sessionStorage.getItem('bb_host_session');
    if (savedSession) {
        try {
            const { pin, hostToken } = JSON.parse(savedSession);
            if (pin && hostToken) {
                reconnectBadge.classList.remove('hidden');
                reconnectBadge.innerText = `Reconnecting to ${pin}...`;
                socket.emit('hostReconnect', { pin, hostToken });
                return;
            }
        } catch (e) {
            sessionStorage.removeItem('bb_host_session');
        }
    }

    // No existing session, request game creation with origin
    socket.emit('hostCreateGame', {
        origin: window.location.origin
    });
});

// Session creation response
socket.on('gameCreated', (data) => {
    currentPin = data.pin;
    currentHostToken = data.hostToken;
    sessionStorage.setItem('bb_host_session', JSON.stringify({ pin: data.pin, hostToken: data.hostToken }));

    document.getElementById('game-pin').innerText = data.pin;
    const urlSpan = document.getElementById('join-url-text');
    if (urlSpan) {
        urlSpan.innerText = window.location.origin + '/';
    }
    if (playerLink) {
        playerLink.href = `/?pin=${data.pin}`;
    }

    // Update QR Code
    if (data.qrDataUrl) {
        qrCodeImg.src = data.qrDataUrl;
        qrModalImg.src = data.qrDataUrl;
        qrModalPin.innerText = data.pin;
    }

    // Update Settings UI
    if (data.settings) {
        currentSettings = data.settings;
        syncSettingsUI(currentSettings);
    }

    // Update Quiz state
    if (data.currentQuiz) {
        currentQuiz = data.currentQuiz;
        draftQuestions = JSON.parse(JSON.stringify(data.currentQuiz.questions || []));
        quizQCountSpan.innerText = draftQuestions.length;
        const activeTitleText = document.getElementById('quiz-active-title-text');
        if (activeTitleText) {
            activeTitleText.innerText = data.currentQuiz.title;
        } else {
            quizActiveTitleBadge.innerText = data.currentQuiz.title;
        }
        quizPackSelect.value = data.currentQuiz.id;
    }

    // Start upbeat lobby music
    if (window.soundEngine) {
        window.soundEngine.startLobbyMusic();
    }
});

// Host Reconnect failed -> create fresh
socket.on('hostReconnectError', () => {
    reconnectBadge.classList.add('hidden');
    sessionStorage.removeItem('bb_host_session');
    socket.emit('hostCreateGame', { origin: window.location.origin });
});

// Host State Restored
socket.on('hostStateRestored', (data) => {
    reconnectBadge.classList.remove('hidden');
    reconnectBadge.innerText = 'Session Restored!';
    setTimeout(() => reconnectBadge.classList.add('hidden'), 3500);

    currentPin = data.pin;
    allPlayers = data.players || [];
    currentSettings = data.settings || currentSettings;
    syncSettingsUI(currentSettings);

    if (data.currentQuiz) {
        currentQuiz = data.currentQuiz;
        draftQuestions = JSON.parse(JSON.stringify(data.currentQuiz.questions || []));
        quizQCountSpan.innerText = draftQuestions.length;
        const activeTitleText = document.getElementById('quiz-active-title-text');
        if (activeTitleText) {
            activeTitleText.innerText = data.currentQuiz.title;
        } else {
            quizActiveTitleBadge.innerText = data.currentQuiz.title;
        }
        quizPackSelect.value = data.currentQuiz.id;
    }

    document.getElementById('game-pin').innerText = data.pin;
    const urlSpan = document.getElementById('join-url-text');
    if (urlSpan) urlSpan.innerText = window.location.origin + '/';
    if (playerLink) playerLink.href = `/?pin=${data.pin}`;

    if (data.qrDataUrl) {
        qrCodeImg.src = data.qrDataUrl;
        qrModalImg.src = data.qrDataUrl;
        qrModalPin.innerText = data.pin;
    }

    // Re-render lobby players
    playerList.innerHTML = '';
    allPlayers.forEach(p => addPlayerToLobbyUI(p));
    updatePlayerCountUI();

    // Reconstruct state
    if (data.state === 'lobby') {
        showScreen('lobby');
        if (allPlayers.length > 0) startBtn.disabled = false;
        if (window.soundEngine) window.soundEngine.startLobbyMusic();
    } else if (data.state === 'playing') {
        showScreen('game');
        renderQuestionUI(data.question, data.currentQuestion, data.totalQuestions);
        timerDisplay.innerText = data.timeRemaining;
        answersReceivedDisplay.innerText = data.answersCount;
        totalAnswersNeededDisplay.innerText = allPlayers.filter(p => p.connected).length;
        if (data.timeRemaining <= 5) timerDisplay.classList.add('hurry-up');
        if (window.soundEngine) window.soundEngine.startCountdownMusic();
    } else if (data.state === 'questionResults') {
        showScreen('game');
        renderQuestionUI(data.question, data.currentQuestion, data.totalQuestions);
        if (data.question && data.question.correct !== undefined) {
            highlightCorrectAnswer(data.question.correct);
        }
        nextBtn.classList.remove('hidden');
    } else if (data.state === 'scoreboard') {
        showScreen('scoreboard');
        renderScoreboardUI(data.topPlayers, data.isFinal);
    } else if (data.state === 'gameOver') {
        showScreen('podium');
        renderPodiumUI(data.topPlayers);
    }
});

// Helper to switch main screens cleanly
function showScreen(screen) {
    document.querySelector('.lobby-container').classList.add('hidden');
    document.getElementById('game-section').classList.add('hidden');
    document.getElementById('scoreboard-section').classList.add('hidden');
    document.getElementById('podium-section').classList.add('hidden');

    if (screen === 'lobby') {
        document.querySelector('.lobby-container').classList.remove('hidden');
        questionProgress.classList.add('hidden');
        quizActiveTitleBadge.classList.add('hidden');
    } else if (screen === 'game') {
        document.getElementById('game-section').classList.remove('hidden');
        questionProgress.classList.remove('hidden');
        quizActiveTitleBadge.classList.remove('hidden');
    } else if (screen === 'scoreboard') {
        document.getElementById('scoreboard-section').classList.remove('hidden');
        questionProgress.classList.remove('hidden');
        quizActiveTitleBadge.classList.remove('hidden');
    } else if (screen === 'podium') {
        document.getElementById('podium-section').classList.remove('hidden');
        questionProgress.classList.add('hidden');
        quizActiveTitleBadge.classList.remove('hidden');
    }
}

// === QR Code Enlarge Modal ===
qrCard.addEventListener('click', () => {
    qrModal.classList.remove('hidden');
});

closeQrModalBtn.addEventListener('click', () => {
    qrModal.classList.add('hidden');
});

qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
        qrModal.classList.add('hidden');
    }
});

// === Toggleable Game Settings Logic ===
toggleSettingsBtn.addEventListener('click', () => {
    settingsDrawer.classList.toggle('hidden');
});

function syncSettingsUI(settings) {
    // Timer
    timerSegmentButtons.forEach(btn => {
        if (parseInt(btn.getAttribute('data-time')) === parseInt(settings.questionTimer)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    shuffleQuestionsToggle.checked = !!settings.shuffleQuestions;
    shuffleAnswersToggle.checked = !!settings.shuffleAnswers;
    streakBonusToggle.checked = !!settings.streakBonus;
    showAnswersDeviceToggle.checked = !!settings.showAnswersOnDevice;
}

function broadcastSettingsChange() {
    if (!currentPin) return;
    socket.emit('hostUpdateSettings', {
        pin: currentPin,
        settings: currentSettings
    });
}

// Segmented timer buttons
timerSegmentButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        timerSegmentButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.questionTimer = parseInt(btn.getAttribute('data-time'));
        broadcastSettingsChange();
    });
});

// Checkboxes
shuffleQuestionsToggle.addEventListener('change', () => {
    currentSettings.shuffleQuestions = shuffleQuestionsToggle.checked;
    broadcastSettingsChange();
});

shuffleAnswersToggle.addEventListener('change', () => {
    currentSettings.shuffleAnswers = shuffleAnswersToggle.checked;
    broadcastSettingsChange();
});

streakBonusToggle.addEventListener('change', () => {
    currentSettings.streakBonus = streakBonusToggle.checked;
    broadcastSettingsChange();
});

showAnswersDeviceToggle.addEventListener('change', () => {
    currentSettings.showAnswersOnDevice = showAnswersDeviceToggle.checked;
    broadcastSettingsChange();
});

// === Quiz Pack Selection & Quiz Builder Logic ===
quizPackSelect.addEventListener('change', () => {
    const selectedVal = quizPackSelect.value;
    if (selectedVal === 'custom') {
        openQuizBuilder();
    } else {
        socket.emit('hostSelectQuiz', {
            pin: currentPin,
            quizId: selectedVal
        });
    }
});

socket.on('quizUpdated', (data) => {
    currentQuiz = data;
    draftQuestions = JSON.parse(JSON.stringify(data.questions || []));
    quizQCountSpan.innerText = draftQuestions.length;
    const activeTitleText = document.getElementById('quiz-active-title-text');
    if (activeTitleText) {
        activeTitleText.innerText = data.quizTitle;
    } else {
        quizActiveTitleBadge.innerText = data.quizTitle;
    }
    quizPackSelect.value = data.quizId;
});

openQuizBuilderBtn.addEventListener('click', () => {
    openQuizBuilder();
});

function openQuizBuilder() {
    customQuizTitleInput.value = currentQuiz.title.replace(/^[^\w]+/, '').trim() || 'Custom Quiz';
    renderDraftQuestionsList();
    resetQuestionForm();
    quizBuilderModal.classList.remove('hidden');
}

closeQuizBuilderBtn.addEventListener('click', () => {
    quizBuilderModal.classList.add('hidden');
});

discardQuizBtn.addEventListener('click', () => {
    quizBuilderModal.classList.add('hidden');
});

function renderDraftQuestionsList() {
    builderQuestionsList.innerHTML = '';
    builderQCountSpan.innerText = draftQuestions.length;

    draftQuestions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'builder-q-item';
        item.innerHTML = `
            <span class="builder-q-title"><strong>${idx + 1}.</strong> ${q.text}</span>
            <div class="builder-q-actions">
                <button class="action-icon-btn edit-q-btn" data-idx="${idx}" title="Edit question">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="action-icon-btn del-q-btn" data-idx="${idx}" title="Delete question">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        builderQuestionsList.appendChild(item);
    });

    // Wire up Edit & Delete
    builderQuestionsList.querySelectorAll('.edit-q-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            loadQuestionToForm(idx);
        });
    });

    builderQuestionsList.querySelectorAll('.del-q-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            if (draftQuestions.length <= 1) {
                alert('A quiz must have at least 1 question.');
                return;
            }
            draftQuestions.splice(idx, 1);
            if (editingQuestionIndex === idx) resetQuestionForm();
            renderDraftQuestionsList();
        });
    });
}

function loadQuestionToForm(idx) {
    const q = draftQuestions[idx];
    if (!q) return;

    editingQuestionIndex = idx;
    formModeTitle.innerText = `Edit Question #${idx + 1}`;
    newQTextInput.value = q.text;
    newAns0Input.value = q.answers[0] || '';
    newAns1Input.value = q.answers[1] || '';
    newAns2Input.value = q.answers[2] || '';
    newAns3Input.value = q.answers[3] || '';

    const radio = document.getElementById(`radio-${q.correct}`);
    if (radio) radio.checked = true;

    saveQuestionBtn.innerText = 'Save Changes';
    cancelEditBtn.classList.remove('hidden');
}

function resetQuestionForm() {
    editingQuestionIndex = -1;
    formModeTitle.innerText = 'Add New Question';
    newQTextInput.value = '';
    newAns0Input.value = '';
    newAns1Input.value = '';
    newAns2Input.value = '';
    newAns3Input.value = '';
    document.getElementById('radio-0').checked = true;
    saveQuestionBtn.innerText = '+ Add Question';
    cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', () => {
    resetQuestionForm();
});

saveQuestionBtn.addEventListener('click', () => {
    const prompt = newQTextInput.value.trim();
    const a0 = newAns0Input.value.trim();
    const a1 = newAns1Input.value.trim();
    const a2 = newAns2Input.value.trim();
    const a3 = newAns3Input.value.trim();

    if (!prompt || !a0 || !a1 || !a2 || !a3) {
        alert('Please fill in the question prompt and all 4 answer options.');
        return;
    }

    const correctRadio = document.querySelector('input[name="correct-answer"]:checked');
    const correctIdx = correctRadio ? parseInt(correctRadio.value) : 0;

    const questionObj = {
        text: prompt,
        answers: [a0, a1, a2, a3],
        correct: correctIdx
    };

    if (editingQuestionIndex >= 0 && editingQuestionIndex < draftQuestions.length) {
        draftQuestions[editingQuestionIndex] = questionObj;
    } else {
        draftQuestions.push(questionObj);
    }

    resetQuestionForm();
    renderDraftQuestionsList();
});

// JSON Drawer for Bulk Import/Export
toggleJsonDrawerBtn.addEventListener('click', () => {
    jsonDrawer.classList.toggle('hidden');
    if (!jsonDrawer.classList.contains('hidden')) {
        jsonTextarea.value = JSON.stringify(draftQuestions, null, 2);
    }
});

applyJsonBtn.addEventListener('click', () => {
    try {
        const parsed = JSON.parse(jsonTextarea.value.trim());
        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('Must be a non-empty array of questions.');
        }

        // Validate each question structure
        const validated = parsed.map(item => {
            if (!item.text || !Array.isArray(item.answers) || item.answers.length !== 4 || item.correct === undefined) {
                throw new Error('Each question must have text, answers [4 strings], and correct (0-3).');
            }
            return {
                text: String(item.text),
                answers: item.answers.map(String),
                correct: Math.max(0, Math.min(3, parseInt(item.correct) || 0))
            };
        });

        draftQuestions = validated;
        renderDraftQuestionsList();
        jsonDrawer.classList.add('hidden');
        alert(`Successfully imported ${validated.length} questions!`);
    } catch (err) {
        alert(`JSON Import Error: ${err.message}`);
    }
});

exportJsonBtn.addEventListener('click', () => {
    jsonTextarea.value = JSON.stringify(draftQuestions, null, 2);
    jsonTextarea.select();
    try {
        navigator.clipboard.writeText(jsonTextarea.value);
        alert('JSON copied to clipboard!');
    } catch (e) {
        alert('JSON ready in box — you can copy it manually.');
    }
});

saveQuizBtn.addEventListener('click', () => {
    if (draftQuestions.length === 0) {
        alert('Your quiz must have at least 1 question!');
        return;
    }

    const title = customQuizTitleInput.value.trim() || 'Custom Quiz';
    socket.emit('hostSelectQuiz', {
        pin: currentPin,
        customQuestions: draftQuestions,
        quizTitle: title
    });

    quizBuilderModal.classList.add('hidden');
});

// === Lobby Players & Kick Player Feature ===
function addPlayerToLobbyUI(player) {
    let li = document.getElementById(`player-node-${player.token || player.id}`);
    if (!li) {
        li = document.createElement('li');
        li.id = `player-node-${player.token || player.id}`;
        li.className = 'player-chip';
        playerList.appendChild(li);
    }

    li.style.borderColor = player.color || '#eb2754';
    li.style.opacity = player.connected === false ? '0.5' : '1';
    li.innerHTML = `
        <div class="host-avatar" style="background-color: ${player.color}">
            ${player.avatar}
        </div>
        <span>${player.name}${player.connected === false ? ' (offline)' : ''}</span>
        <button class="kick-btn" data-token="${player.token}" data-id="${player.id}" title="Kick ${player.name} from lobby">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    // Wire kick event
    const kickBtn = li.querySelector('.kick-btn');
    kickBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const confirmKick = confirm(`Are you sure you want to kick ${player.name}?`);
        if (confirmKick) {
            socket.emit('hostKickPlayer', {
                pin: currentPin,
                playerId: player.id,
                token: player.token
            });
        }
    });
}

function updatePlayerCountUI() {
    const connectedCount = allPlayers.filter(p => p.connected !== false).length;
    playerCountSpan.innerText = connectedCount;
    startBtn.disabled = connectedCount === 0;
}

// Player joined
socket.on('playerJoined', (player) => {
    allPlayers.push(player);
    addPlayerToLobbyUI(player);
    updatePlayerCountUI();

    if (window.soundEngine) {
        window.soundEngine.playAnswerClick();
    }
});

// Player kicked acknowledgment
socket.on('playerKickedSuccess', (data) => {
    allPlayers = data.remainingPlayers || allPlayers.filter(p => p.token !== data.kickedToken && p.id !== data.kickedPlayerId);
    const node = document.getElementById(`player-node-${data.kickedToken}`) || document.getElementById(`player-node-${data.kickedPlayerId}`);
    if (node) node.remove();
    updatePlayerCountUI();
});

// Player connection update (disconnect / reconnect)
socket.on('playerConnectionUpdate', (data) => {
    const p = allPlayers.find(pl => pl.token === data.token || pl.id === data.id);
    if (p) {
        p.connected = data.connected;
        addPlayerToLobbyUI(p);
        updatePlayerCountUI();
    }
});

// Start button
startBtn.addEventListener('click', () => {
    socket.emit('hostStartGame');
});

// === Question Logic ===
function renderQuestionUI(qData, qIndex = 0, totalQuestions = 5) {
    timerDisplay.classList.remove('hurry-up');
    timerDisplay.innerText = String(qData.totalTime || currentSettings.questionTimer || 20);
    answersReceivedDisplay.innerText = '0';
    totalAnswersNeededDisplay.innerText = String(qData.totalPlayers || allPlayers.filter(p => p.connected).length || 0);
    answersProgressBar.style.width = '0%';
    nextBtn.classList.add('hidden');
    analyticsPanel.classList.add('hidden');

    questionProgress.innerText = `Question ${qIndex + 1} of ${totalQuestions}`;

    document.querySelectorAll('.answer-card').forEach(card => card.classList.remove('dimmed'));

    document.getElementById('question-text').innerText = qData.text;
    document.getElementById('ans-0').innerText = qData.answers[0];
    document.getElementById('ans-1').innerText = qData.answers[1];
    document.getElementById('ans-2').innerText = qData.answers[2];
    document.getElementById('ans-3').innerText = qData.answers[3];

    // Reset bar labels for analytics
    document.getElementById('bar-label-0').innerText = qData.answers[0];
    document.getElementById('bar-label-1').innerText = qData.answers[1];
    document.getElementById('bar-label-2').innerText = qData.answers[2];
    document.getElementById('bar-label-3').innerText = qData.answers[3];

    // Reset bars
    for (let i = 0; i < 4; i++) {
        document.getElementById(`bar-${i}`).style.height = '0%';
        document.getElementById(`count-${i}`).innerText = '0';
        document.getElementById(`badge-${i}`).innerText = '';
    }
}

socket.on('showQuestion', (data) => {
    showScreen('game');
    renderQuestionUI(data, data.questionIndex, data.totalQuestions);

    if (window.soundEngine) {
        window.soundEngine.startCountdownMusic();
    }
});

// Update clock & tension
socket.on('timerUpdate', (timeLeft) => {
    timerDisplay.innerText = timeLeft;

    if (timeLeft <= 5 && timeLeft > 0) {
        timerDisplay.classList.add('hurry-up');
    } else {
        timerDisplay.classList.remove('hurry-up');
    }

    if (window.soundEngine) {
        window.soundEngine.updateTimerTick(timeLeft);
    }
});

// Update live answer count
socket.on('updateAnswerCount', (data) => {
    const count = typeof data === 'object' ? data.count : data;
    const total = typeof data === 'object' ? data.total : (parseInt(totalAnswersNeededDisplay.innerText) || 1);
    answersReceivedDisplay.innerText = count;
    totalAnswersNeededDisplay.innerText = total;

    const pct = Math.min(100, Math.round((count / (total || 1)) * 100));
    answersProgressBar.style.width = `${pct}%`;
});

// Highlight correct answer and reveal Real-Time Answer Distribution Analytics
function highlightCorrectAnswer(analyticsData) {
    const correctIndex = typeof analyticsData === 'object' ? analyticsData.correctIndex : analyticsData;

    // Dim incorrect cards
    for (let i = 0; i < 4; i++) {
        if (i !== correctIndex) {
            document.getElementById(`card-${i}`).classList.add('dimmed');
        }
    }

    // Populate Analytics Panel if data present
    if (typeof analyticsData === 'object' && analyticsData.distribution) {
        analyticsPanel.classList.remove('hidden');

        const { distribution, percentages, accuracyPct, fastestResponder } = analyticsData;

        for (let i = 0; i < 4; i++) {
            const count = distribution[i] || 0;
            const pct = percentages[i] || 0;

            document.getElementById(`count-${i}`).innerText = `${count} (${pct}%)`;
            document.getElementById(`bar-${i}`).style.height = `${Math.max(6, pct)}%`;

            const badge = document.getElementById(`badge-${i}`);
            if (i === correctIndex) {
                badge.innerHTML = `<svg class="bar-badge-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#26890c"/><path d="M8 12l3 3 5-6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            } else if (count > 0) {
                badge.innerHTML = `<svg class="bar-badge-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#eb2754"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`;
            } else {
                badge.innerHTML = '';
            }
        }

        // Summary stats
        accuracyStat.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="inline-svg"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <span>Question Accuracy: <strong>${accuracyPct}%</strong> (${analyticsData.correctCount}/${analyticsData.totalAnswered} correct)</span>
        `;
        
        if (fastestResponder) {
            fastestStat.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="inline-svg"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/></svg>
                <span>Fastest: <strong>${fastestResponder.name}</strong> (${fastestResponder.timeSec}s)</span>
            `;
        } else {
            fastestStat.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="inline-svg"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/></svg>
                <span>Fastest: <strong>-</strong></span>
            `;
        }
    }

    nextBtn.classList.remove('hidden');
}

socket.on('showCorrectAnswer', (analyticsData) => {
    timerDisplay.classList.remove('hurry-up');
    highlightCorrectAnswer(analyticsData);

    if (window.soundEngine) {
        window.soundEngine.stopCountdownMusic();
        window.soundEngine.playTimesUp();
    }
});

// Next button clicks
nextBtn.addEventListener('click', () => {
    socket.emit('hostNext');
});

scoreboardNextBtn.addEventListener('click', () => {
    socket.emit('hostNext');
});

// === Scoreboard Logic ===
function renderScoreboardUI(topPlayers, isFinal) {
    if (isFinal) {
        scoreboardNextBtn.innerText = 'Show Final Podium';
    } else {
        scoreboardNextBtn.innerText = 'Next Question';
    }

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    const rankSVGs = [
        `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" fill="#f2ce46"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#1e053a"/></svg>`,
        `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" fill="#e0e0e0"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#1e053a"/></svg>`,
        `<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" fill="#e67e22"/><path d="M12 7l1.5 3.5 3.5.5-2.5 2.5.5 3.5-3-1.8-3 1.8.5-3.5-2.5-2.5 3.5-.5z" fill="#ffffff"/></svg>`
    ];

    topPlayers.forEach((p, index) => {
        const li = document.createElement('li');
        li.className = 'rank-item';
        li.style.animationDelay = `${index * 0.12}s`;
        li.style.borderColor = p.color || '#eb2754';
        li.style.justifyContent = 'space-between';

        const rankIconHtml = rankSVGs[index] || `<span style="font-weight: 900; font-size: 1.1rem; color: #555;">#${index + 1}</span>`;

        li.innerHTML = `
            <div class="rank-item-user">
                <span class="rank-badge">${rankIconHtml}</span>
                <div class="host-avatar" style="background-color: ${p.color}">${p.avatar}</div>
                <span class="rank-user-name">${p.name}</span>
            </div>
            <span class="rank-score-val">${p.score.toLocaleString()} pts</span>
        `;
        list.appendChild(li);
    });
}

socket.on('showScoreboard', (topPlayers, isFinal) => {
    showScreen('scoreboard');
    renderScoreboardUI(topPlayers, isFinal);

    if (window.soundEngine) {
        window.soundEngine.stopCountdownMusic();
        window.soundEngine.playScoreboardFanfare();
    }
});

// === Authentic Kahoot Final Podium & Celebration Logic ===
let lastPodiumRanking = [];
let podiumTimeouts = [];

function clearPodiumTimeouts() {
    podiumTimeouts.forEach(t => clearTimeout(t));
    podiumTimeouts = [];
}

function spawnAmbientStars() {
    const layer = document.getElementById('stage-stars-layer');
    if (!layer) return;
    layer.innerHTML = '';
    const starCount = 18;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('span');
        star.className = 'floating-star';
        star.innerText = Math.random() > 0.5 ? '✦' : '★';
        star.style.left = `${Math.random() * 94 + 3}%`;
        star.style.bottom = `${Math.random() * 70 + 10}px`;
        star.style.animationDelay = `${Math.random() * 4}s`;
        star.style.animationDuration = `${3 + Math.random() * 3}s`;
        star.style.fontSize = `${0.75 + Math.random() * 0.9}rem`;
        layer.appendChild(star);
    }
}

function renderPodiumUI(finalRanking) {
    lastPodiumRanking = Array.isArray(finalRanking) ? finalRanking : [];
    clearPodiumTimeouts();
    spawnAmbientStars();

    const stage = document.getElementById('podium-stage');
    const runnerUpsSection = document.getElementById('runner-ups-section');
    const runnerUpsList = document.getElementById('runner-ups-list');
    const coneLeft = document.getElementById('cone-left');
    const coneCenter = document.getElementById('cone-center');
    const coneRight = document.getElementById('cone-right');

    stage.innerHTML = '';
    runnerUpsSection.classList.add('hidden');
    runnerUpsList.innerHTML = '';

    if (coneCenter) coneCenter.classList.remove('champion-spotlight');
    if (coneLeft) coneLeft.style.opacity = '0.14';
    if (coneRight) coneRight.style.opacity = '0.14';

    const first = lastPodiumRanking[0];
    const second = lastPodiumRanking[1];
    const third = lastPodiumRanking[2];

    let col2 = null;
    let col1 = null;
    let col3 = null;

    // 2nd Place Column (Rendered on Left of Stage)
    if (second) {
        col2 = document.createElement('div');
        col2.className = 'podium-column col-rank-2';
        col2.innerHTML = `
            <div class="podium-user-group">
                <div class="podium-medal-crown">
                    <div class="podium-medal-badge">
                        <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
                            <circle cx="12" cy="12" r="10" fill="url(#silverGrad2)" stroke="#adb5bd" stroke-width="2"/>
                            <path d="M12 6.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#1e053a"/>
                            <defs>
                                <linearGradient id="silverGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#ffffff"/>
                                    <stop offset="100%" stop-color="#ced4da"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
                <div class="podium-avatar-card" style="background-color: ${second.color}">${second.avatar}</div>
                <span class="podium-user-name" title="${second.name}">${second.name}</span>
                <span class="podium-score-pill">${second.score.toLocaleString()} pts</span>
            </div>
            <div class="podium-3d-block">
                <div class="block-top-face"></div>
                <div class="block-front-face">
                    <span class="block-rank-number">2</span>
                </div>
                <div class="block-floor-shadow"></div>
            </div>
        `;
        stage.appendChild(col2);
    }

    // 1st Place Column (Rendered in Center)
    if (first) {
        col1 = document.createElement('div');
        col1.className = 'podium-column col-rank-1';
        col1.innerHTML = `
            <div class="podium-user-group">
                <div class="podium-medal-crown">
                    <svg viewBox="0 0 24 24" width="46" height="46" fill="#ffd700" stroke="#b8860b" stroke-width="1.5" class="podium-crown-svg">
                        <path d="M2 19h20v2H2z" fill="#b8860b"/>
                        <polygon points="3,17 7,9 12,14 17,9 21,17"/>
                        <circle cx="3" cy="17" r="1.5" fill="#ffffff"/>
                        <circle cx="7" cy="9" r="1.5" fill="#ffffff"/>
                        <circle cx="12" cy="14" r="1.5" fill="#ffffff"/>
                        <circle cx="17" cy="9" r="1.5" fill="#ffffff"/>
                        <circle cx="21" cy="17" r="1.5" fill="#ffffff"/>
                    </svg>
                </div>
                <div class="podium-avatar-card" style="background-color: ${first.color};">${first.avatar}</div>
                <span class="podium-user-name" title="${first.name}">${first.name}</span>
                <span class="podium-score-pill">${first.score.toLocaleString()} pts</span>
            </div>
            <div class="podium-3d-block">
                <div class="block-top-face"></div>
                <div class="block-front-face">
                    <span class="block-rank-number">1</span>
                </div>
                <div class="block-floor-shadow"></div>
            </div>
        `;
        stage.appendChild(col1);
    }

    // 3rd Place Column (Rendered on Right of Stage)
    if (third) {
        col3 = document.createElement('div');
        col3.className = 'podium-column col-rank-3';
        col3.innerHTML = `
            <div class="podium-user-group">
                <div class="podium-medal-crown">
                    <div class="podium-medal-badge">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                            <circle cx="12" cy="12" r="10" fill="url(#bronzeGrad3)" stroke="#a04000" stroke-width="2"/>
                            <path d="M12 6.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#ffffff"/>
                            <defs>
                                <linearGradient id="bronzeGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#f5b041"/>
                                    <stop offset="100%" stop-color="#ba4a00"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
                <div class="podium-avatar-card" style="background-color: ${third.color}">${third.avatar}</div>
                <span class="podium-user-name" title="${third.name}">${third.name}</span>
                <span class="podium-score-pill">${third.score.toLocaleString()} pts</span>
            </div>
            <div class="podium-3d-block">
                <div class="block-top-face"></div>
                <div class="block-front-face">
                    <span class="block-rank-number">3</span>
                </div>
                <div class="block-floor-shadow"></div>
            </div>
        `;
        stage.appendChild(col3);
    }

    // Runner-ups cards (4th & 5th)
    const runnerUps = lastPodiumRanking.slice(3, 5);
    if (runnerUps.length > 0) {
        runnerUps.forEach((p, idx) => {
            const card = document.createElement('div');
            card.className = 'runner-up-card';
            card.innerHTML = `
                <span style="font-weight: 800; font-size: 1.05rem; color: #f2ce46;">#${idx + 4}</span>
                <div class="host-avatar" style="background-color: ${p.color}; width: 34px; height: 34px;">${p.avatar}</div>
                <span style="font-weight: 800; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</span>
                <span style="opacity: 0.85; font-weight: 700;">${p.score.toLocaleString()} pts</span>
            `;
            runnerUpsList.appendChild(card);
        });
    }

    // === Theatrical Reveal Choreography ===
    let currentTime = 400;

    // Reveal 3rd Place first (if exists)
    if (col3) {
        podiumTimeouts.push(setTimeout(() => {
            if (coneRight) coneRight.style.opacity = '0.38';
            if (window.soundEngine) window.soundEngine.playPodiumDrumroll(1.2);
        }, currentTime));

        currentTime += 1300;
        podiumTimeouts.push(setTimeout(() => {
            col3.classList.add('revealed');
            if (window.soundEngine) {
                window.soundEngine.playPillarLand();
                window.soundEngine.playMedalChime(3);
            }
        }, currentTime));

        currentTime += 1100;
    }

    // Reveal 2nd Place next (if exists)
    if (col2) {
        podiumTimeouts.push(setTimeout(() => {
            if (coneLeft) coneLeft.style.opacity = '0.38';
            if (window.soundEngine) window.soundEngine.playPodiumDrumroll(1.2);
        }, currentTime));

        currentTime += 1300;
        podiumTimeouts.push(setTimeout(() => {
            col2.classList.add('revealed');
            if (window.soundEngine) {
                window.soundEngine.playPillarLand();
                window.soundEngine.playMedalChime(2);
            }
        }, currentTime));

        currentTime += 1200;
    }

    // Grand Reveal: 1st Place Champion!
    if (col1) {
        podiumTimeouts.push(setTimeout(() => {
            if (coneCenter) coneCenter.classList.add('champion-spotlight');
            if (window.soundEngine) window.soundEngine.playPodiumDrumroll(1.8);
        }, currentTime));

        currentTime += 1800;
        podiumTimeouts.push(setTimeout(() => {
            col1.classList.add('revealed');
            if (window.soundEngine) {
                window.soundEngine.playPillarLand();
                window.soundEngine.playChampionFanfare();
                window.soundEngine.playCrowdApplause();
            }
            if (window.confettiEngine) {
                window.confettiEngine.launchKahootCannons(8000);
            }
        }, currentTime));

        currentTime += 1000;
    }

    // Reveal Runners-up Section
    if (runnerUps.length > 0) {
        podiumTimeouts.push(setTimeout(() => {
            runnerUpsSection.classList.remove('hidden');
        }, currentTime));
    }
}

// Show Full Leaderboard Modal
function openFinalLeaderboardModal() {
    const modal = document.getElementById('final-leaderboard-modal');
    const list = document.getElementById('final-leaderboard-list');
    if (!modal || !list) return;

    list.innerHTML = '';
    if (!lastPodiumRanking || lastPodiumRanking.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #888; padding: 2rem;">No players participated in this game.</div>';
    } else {
        lastPodiumRanking.forEach((p, idx) => {
            const rank = idx + 1;
            const row = document.createElement('div');
            row.className = 'final-standings-row';

            let badgeClass = 'badge-rank-other';
            if (rank === 1) badgeClass = 'badge-rank-1';
            else if (rank === 2) badgeClass = 'badge-rank-2';
            else if (rank === 3) badgeClass = 'badge-rank-3';

            row.innerHTML = `
                <div class="final-standings-left">
                    <div class="final-rank-badge ${badgeClass}">${rank}</div>
                    <div class="host-avatar" style="background-color: ${p.color}; width: 38px; height: 38px; font-size: 1.2rem;">${p.avatar}</div>
                    <span class="final-player-name" title="${p.name}">${p.name}</span>
                </div>
                <div class="final-score-text">${p.score.toLocaleString()} pts</div>
            `;
            list.appendChild(row);
        });
    }

    modal.classList.remove('hidden');
}

function closeFinalLeaderboardModal() {
    const modal = document.getElementById('final-leaderboard-modal');
    if (modal) modal.classList.add('hidden');
}

// Attach Podium Control Button Listeners
const podiumReplayBtn = document.getElementById('podium-replay-btn');
if (podiumReplayBtn) {
    podiumReplayBtn.addEventListener('click', () => {
        if (lastPodiumRanking && lastPodiumRanking.length > 0) {
            renderPodiumUI(lastPodiumRanking);
        }
    });
}

const podiumFullBoardBtn = document.getElementById('podium-full-board-btn');
if (podiumFullBoardBtn) {
    podiumFullBoardBtn.addEventListener('click', openFinalLeaderboardModal);
}

const closeFinalLeaderboardBtn1 = document.getElementById('close-final-leaderboard');
if (closeFinalLeaderboardBtn1) {
    closeFinalLeaderboardBtn1.addEventListener('click', closeFinalLeaderboardModal);
}

const closeFinalLeaderboardBtn2 = document.getElementById('close-final-leaderboard-btn');
if (closeFinalLeaderboardBtn2) {
    closeFinalLeaderboardBtn2.addEventListener('click', closeFinalLeaderboardModal);
}

socket.on('showGameOver', (finalRanking) => {
    showScreen('podium');
    renderPodiumUI(finalRanking);
});

// Host New Game button
if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
        sessionStorage.removeItem('bb_host_session');
        window.location.reload();
    });
}
