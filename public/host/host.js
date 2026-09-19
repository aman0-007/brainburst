const socket = io(); 

const statusText = document.getElementById('connection-status');
const startBtn = document.getElementById('start-game-btn');
const playerCountSpan = document.getElementById('player-count');
const playerList = document.getElementById('player-list');
const timerDisplay = document.getElementById('timer-display');
const answersReceivedDisplay = document.getElementById('answers-received');
const nextBtn = document.getElementById('next-btn');
const scoreboardNextBtn = document.getElementById('scoreboard-next-btn');

let playerCount = 0;

socket.on('connect', () => {
    statusText.innerText = 'Connected to Server!';
    statusText.style.color = '#26890c'; // Matches the green theme
    
    // Immediately ask the server to create a game
    socket.emit('hostCreateGame');
});

// Display the generated PIN on the big screen
socket.on('gameCreated', (data) => {
    document.getElementById('game-pin').innerText = data.pin;
});

// Add new players to the UI list as they join
socket.on('playerJoined', (player) => {
    const li = document.createElement('li');
    
    // Dynamically set the border color to match their avatar color
    li.style.borderColor = player.color;
    
    // Inject the avatar SVG and the player's name
    li.innerHTML = `
        
            ${player.avatar}
        
        ${player.name}
    `;
    
    playerList.appendChild(li);

    playerCount++;
    playerCountSpan.innerText = playerCount;

    if (playerCount > 0) {
        startBtn.disabled = false;
    }
});

// Wire up the start button
startBtn.addEventListener('click', () => {
    socket.emit('hostStartGame');
});

// Update the clock every second
socket.on('timerUpdate', (timeLeft) => {
    timerDisplay.innerText = timeLeft;
});

// Update the counter when a player taps an answer
socket.on('updateAnswerCount', (count) => {
    answersReceivedDisplay.innerText = count;
});

// When time is up, highlight the correct answer
socket.on('showCorrectAnswer', (correctIndex) => {
    // Dim all answers first
    for (let i = 0; i < 4; i++) {
        if (i !== correctIndex) {
            document.getElementById(`ans-${i}`).parentElement.classList.add('dimmed');
        }
    }
});

// Handle receiving a question
// Reset the UI when a new question starts
// Update your existing showQuestion block to hide the scoreboard and next button:
socket.on('showQuestion', (data) => {
    document.querySelector('.lobby-container').classList.add('hidden');
    document.getElementById('scoreboard-section').classList.add('hidden'); // NEW
    document.getElementById('game-section').classList.remove('hidden');
    
    nextBtn.classList.add('hidden'); // NEW
    timerDisplay.innerText = '20'; // NEW
    answersReceivedDisplay.innerText = '0'; // NEW
    document.querySelectorAll('.answer-card').forEach(card => card.classList.remove('dimmed')); // NEW
    
    document.getElementById('question-text').innerText = data.text;
    document.getElementById('ans-0').innerText = data.answers[0];
    document.getElementById('ans-1').innerText = data.answers[1];
    document.getElementById('ans-2').innerText = data.answers[2];
    document.getElementById('ans-3').innerText = data.answers[3];
});

// Show the Next button when the answer is revealed
socket.on('showCorrectAnswer', (correctIndex) => {
    for (let i = 0; i < 4; i++) {
        if (i !== correctIndex) {
            document.getElementById(`ans-${i}`).parentElement.classList.add('dimmed');
        }
    }
    nextBtn.classList.remove('hidden');
});

// Handle clicking Next on the Game Board
nextBtn.addEventListener('click', () => {
    socket.emit('hostNext');
});

// Handle clicking Next Question on the Scoreboard
scoreboardNextBtn.addEventListener('click', () => {
    socket.emit('hostNext');
});

// Display the Scoreboard
socket.on('showScoreboard', (topPlayers) => {
    document.getElementById('game-section').classList.add('hidden');
    document.getElementById('scoreboard-section').classList.remove('hidden');
    
    if (isFinal) {
        scoreboardNextBtn.innerText = 'Show Final Podium';
    } else {
        scoreboardNextBtn.innerText = 'Next Question';
    }
    
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = ''; // Clear previous
    
    topPlayers.forEach((p, index) => {
        const li = document.createElement('li');
        li.style.borderColor = p.color;
        li.style.width = '60%';
        li.style.justifyContent = 'space-between';
        
        // Make sure the <div> and <span> tags are included here!
        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 2rem; color: #666;">#${index + 1}</span>
                <div class="host-avatar" style="background-color: ${p.color}">${p.avatar}</div>
                <span>${p.name}</span>
            </div>
            <span>${p.score} pts</span>
        `;
        list.appendChild(li);
    });
});

// Basic Game Over handler
socket.on('showGameOver', () => {
    document.querySelector('#scoreboard-section h2').innerText = 'Final Podium!';
    scoreboardNextBtn.classList.add('hidden');
});