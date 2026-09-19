// In-memory database to store active games
const games = {};

const questions = [
    {
        text: "Which planet is known as the Red Planet?",
        answers: ["Venus", "Jupiter", "Mars", "Saturn"],
        correct: 2 // Array index (Mars is index 2)
    },
    {
        text: "What is the fastest land animal?",
        answers: ["Cheetah", "Lion", "Horse", "Leopard"],
        correct: 0 // (Cheetah is index 0)
    }
];

function generatePIN() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit PIN
}

module.exports = function(io) {
    io.on('connection', (socket) => {
        
        // 1. HOST asks to start a new game
        socket.on('hostCreateGame', () => {
            let pin = generatePIN();
            // Make sure the PIN isn't already in use
            while (games[pin]) { pin = generatePIN(); }

            // Create the game state
            games[pin] = {
                hostId: socket.id,
                players: [],
                state: 'lobby' // We will change this to 'playing' later
            };

            // Connect the host's socket to a room named after the PIN
            socket.join(pin);
            
            console.log(`Game created with PIN: ${pin}`);
            socket.emit('gameCreated', { pin });
        });

        // 2. PLAYER asks to join with a PIN and Name
        socket.on('playerJoinGame', (data) => {
            const { pin, name } = data;
            const game = games[pin];

            if (!game) {
                socket.emit('joinError', { message: 'Invalid PIN. Try again.' });
                return;
            }

            if (game.state !== 'lobby') {
                socket.emit('joinError', { message: 'Game has already started!' });
                return;
            }

            const alreadyJoined = game.players.some(p => p.id === socket.id);
            if (alreadyJoined) return;

            const nameTaken = game.players.some(p => p.name.toLowerCase() === name.toLowerCase());
            if (nameTaken) {
                socket.emit('joinError', { message: 'Nickname already taken. Pick another!' });
                return;
            }
            // Create the player object
            const player = { 
                id: socket.id, 
                name: name, 
                score: 0, 
                avatar: data.avatar, 
                color: data.color 
            };
            game.players.push(player);

            // Add the player to the Socket.IO room
            socket.join(pin);
            console.log(`Player ${name} joined game ${pin}`);
            
            // Tell the mobile screen they got in successfully
            socket.emit('joinSuccess');
            
            // Tell the Big Screen to add their name to the list
            io.to(game.hostId).emit('playerJoined', player);
        });

        // 3. HOST starts the game and the timer
        socket.on('hostStartGame', () => {
            const pin = Object.keys(games).find(p => games[p].hostId === socket.id);
            if (!pin) return;
            
            const game = games[pin];
            game.currentQuestion = 0;
            
            startQuestion(pin, game);
        });

        // --- HELPER FUNCTIONS --- //
        function startQuestion(pin, game) {
            game.state = 'playing';

            const q = questions[game.currentQuestion];
            game.answersCount = 0;
            game.timeRemaining = 20; // 20 seconds per question
            
            // Reset all players' answered status
            game.players.forEach(p => p.hasAnswered = false);

            // Send question to Host and Controller to Players
            io.to(game.hostId).emit('showQuestion', { text: q.text, answers: q.answers });
            io.to(pin).emit('showController');

            // Start the countdown interval
            game.timer = setInterval(() => {
                game.timeRemaining--;
                io.to(game.hostId).emit('timerUpdate', game.timeRemaining);

                if (game.timeRemaining <= 0) {
                    clearInterval(game.timer);
                    endQuestion(pin, game);
                }
            }, 1000); // Runs every 1 second
        }

        // UPDATED: PLAYER submits an answer
        socket.on('submitAnswer', (data) => {
            const { pin, answerIndex } = data;
            const game = games[pin];
            if (!game || game.state !== 'playing') return;

            const player = game.players.find(p => p.id === socket.id);
            if (!player || player.hasAnswered) return;

            player.hasAnswered = true;
            game.answersCount++;

            const q = questions[game.currentQuestion];
            if (answerIndex === q.correct) {
                const speedBonus = Math.round((game.timeRemaining / 20) * 500);
                player.lastPoints = 500 + speedBonus; // Store points for this round
                player.score += player.lastPoints;
                player.isCorrect = true;
            } else {
                player.lastPoints = 0;
                player.isCorrect = false;
            }

            io.to(game.hostId).emit('updateAnswerCount', game.answersCount);
            socket.emit('answerReceived');

            if (game.answersCount >= game.players.length) {
                clearInterval(game.timer);
                endQuestion(pin, game);
            }
        });

        // NEW: Host clicks "Next"
        socket.on('hostNext', () => {
            const pin = Object.keys(games).find(p => games[p].hostId === socket.id);
            if (!pin) return;
            const game = games[pin];
            
            if (game.state === 'questionResults') {
                game.state = 'scoreboard';
                // Sort players by score highest to lowest, take top 5
                const topPlayers = [...game.players].sort((a, b) => b.score - a.score).slice(0, 5);
                const isFinal = game.currentQuestion >= questions.length - 1;

                io.to(game.hostId).emit('showScoreboard', topPlayers, isFinal);
                io.to(pin).emit('showWaitingScreen', { message: 'Look at the Scoreboard!', color: '#46178f' });
            } 
            else if (game.state === 'scoreboard') {
                game.currentQuestion++;
                if (game.currentQuestion < questions.length) {
                    startQuestion(pin, game);
                } else {
                    game.state = 'gameOver';
                    io.to(game.hostId).emit('showGameOver');
                    io.to(pin).emit('showWaitingScreen', { message: 'Game Over!', color: '#333' });
                }
            }
        });

        // UPDATED HELPER: endQuestion
        function endQuestion(pin, game) {
            game.state = 'questionResults';
            const q = questions[game.currentQuestion];
            
            io.to(game.hostId).emit('showCorrectAnswer', q.correct);
            
            // Send personalized results to each player
            game.players.forEach(p => {
                let msg = 'Time is up!';
                let bgColor = '#333'; // dark gray for no answer
                
                if (p.hasAnswered) {
                    msg = p.isCorrect ? 'Correct!' : 'Incorrect!';
                    bgColor = p.isCorrect ? '#26890c' : '#eb2754'; // Green or Red
                }
                
                io.to(p.id).emit('questionResult', { 
                    message: msg, 
                    points: p.lastPoints || 0, 
                    color: bgColor,
                    score: p.score
                });
                
                // Reset variables for the next question
                p.lastPoints = 0;
                p.isCorrect = false;
                p.hasAnswered = false;
            });
        }
        
        socket.on('disconnect', () => {
            // We will add cleanup logic here later if a player drops
            console.log(`Disconnected: ${socket.id}`);
        });
    });
};