const socket = io();

const statusText = document.getElementById('connection-status');
const pinInput = document.getElementById('pin-input');
const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');

const joinSection = document.getElementById('join-section');
const waitingSection = document.getElementById('waiting-section');

const ctrlButtons = document.querySelectorAll('.ctrl-btn');

let selectedAvatar = document.querySelector('.avatar-option.selected').innerHTML;
let selectedColor = document.querySelector('.avatar-option.selected').getAttribute('data-color');

const avatarOptions = document.querySelectorAll('.avatar-option');

socket.on('connect', () => {
    statusText.innerText = 'Connected!';
    statusText.style.color = '#26890c'; // Matches the green theme
    
    // Enable the form since we can talk to the server
    pinInput.disabled = false;
    nameInput.disabled = false;
    joinBtn.disabled = false;
});

joinBtn.addEventListener('click', () => {
    const pin = pinInput.value;
    const name = nameInput.value;
    
    if (pin && name) {
        // Lock the button so they can't double-click
        joinBtn.disabled = true;
        joinBtn.innerText = 'Joining...';
        
        socket.emit('playerJoinGame', { pin, name, avatar: selectedAvatar, color: selectedColor });
    } else {
        alert("Please enter a PIN and a Name.");
    }
});

socket.on('joinSuccess', () => {
    // Hide the login form and show the green waiting screen
    joinSection.classList.add('hidden');
    waitingSection.classList.remove('hidden');
});

socket.on('joinError', (data) => {
    alert(data.message);
    // Unlock the button so they can try a different PIN or Name
    joinBtn.disabled = false;
    joinBtn.innerText = 'Enter';
});

avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove selection from all
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        // Add to clicked
        option.classList.add('selected');
        // Store the chosen SVG and color
        selectedAvatar = option.innerHTML;
        selectedColor = option.getAttribute('data-color');
    });
});

socket.on('showController', () => {
    document.getElementById('waiting-section').classList.add('hidden');
    document.getElementById('controller-section').classList.remove('hidden');
});

ctrlButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        const pin = pinInput.value;
        
        // Send the answer to the server
        socket.emit('submitAnswer', { pin, answerIndex: index });
    });
});

// When the server confirms the answer was received
socket.on('answerReceived', () => {
    document.getElementById('controller-section').classList.add('hidden');
    document.getElementById('waiting-section').classList.remove('hidden');
    document.querySelector('#waiting-section h2').innerText = 'Answer Sent!';
    document.querySelector('#waiting-section p').innerText = 'Waiting for others...';
});

// NEW: Handle personalized Correct/Incorrect results
socket.on('questionResult', (data) => {
    document.getElementById('controller-section').classList.add('hidden');
    
    const waitScreen = document.getElementById('waiting-section');
    waitScreen.classList.remove('hidden');
    waitScreen.style.backgroundColor = data.color; // Turns Green, Red, or Gray
    
    document.getElementById('waiting-title').innerText = data.message;
    
    if (data.points > 0) {
        document.getElementById('waiting-subtitle').innerText = `+${data.points} Points!`;
    } else {
        document.getElementById('waiting-subtitle').innerText = 'Better luck next time.';
    }
    
    document.getElementById('waiting-score').innerText = `Total Score: ${data.score}`;
});

// UPDATED: Handle generic waiting screen (like during scoreboard)
socket.on('showWaitingScreen', (data) => {
    document.getElementById('controller-section').classList.add('hidden');
    
    const waitScreen = document.getElementById('waiting-section');
    waitScreen.classList.remove('hidden');
    waitScreen.style.backgroundColor = data.color || '#26890c'; 
    
    document.getElementById('waiting-title').innerText = data.message || 'Waiting...';
    document.getElementById('waiting-subtitle').innerText = '';
    document.getElementById('waiting-score').innerText = '';
});