const QRCode = require('qrcode');
const { quizPacks } = require('./quizzes');

// In-memory database to store active games
const games = {};

function generatePIN() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit PIN
}

function generateToken(prefix) {
    return `${prefix}_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
}

// Utility to shuffle an array (Fisher-Yates)
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

module.exports = function(io) {
    io.on('connection', (socket) => {
        
        // 1. HOST asks to start a new game
        socket.on('hostCreateGame', async (options) => {
            let pin = generatePIN();
            // Make sure the PIN isn't already in use
            while (games[pin]) { pin = generatePIN(); }

            const hostToken = generateToken('host');
            const selectedQuizKey = (options && options.quizId && quizPacks[options.quizId]) ? options.quizId : 'general';
            const initialQuiz = quizPacks[selectedQuizKey];

            // Deep clone questions so edits don't mutate original preset
            const quizQuestions = JSON.parse(JSON.stringify(initialQuiz.questions));

            // Default settings
            const settings = {
                questionTimer: 20,          // 10, 20, 30 seconds
                shuffleQuestions: false,
                shuffleAnswers: false,
                streakBonus: true,
                showAnswersOnDevice: true   // Show answer texts on player device or shapes only
            };

            // Generate high-res QR code data URL for direct join
            let qrDataUrl = '';
            try {
                // In production / preview, relative query `/?pin=PIN` or full host URL
                const origin = (options && options.origin) ? options.origin : '';
                const joinUrl = origin ? `${origin}/?pin=${pin}` : `/?pin=${pin}`;
                qrDataUrl = await QRCode.toDataURL(joinUrl, {
                    errorCorrectionLevel: 'M',
                    margin: 1,
                    width: 260,
                    color: {
                        dark: '#1e053a',
                        light: '#ffffff'
                    }
                });
            } catch (err) {
                console.error('Error generating QR code:', err);
            }

            // Create the game state
            games[pin] = {
                pin,
                hostId: socket.id,
                hostToken: hostToken,
                hostConnected: true,
                players: [],
                state: 'lobby',
                currentQuestion: 0,
                answersCount: 0,
                timeRemaining: 20,
                timer: null,
                questionStartTime: null,
                quizId: selectedQuizKey,
                quizTitle: initialQuiz.title,
                activeQuestions: quizQuestions,
                settings: settings,
                qrDataUrl: qrDataUrl,
                questionAnswersRecord: [] // stores { playerId, answerIndex, timeTaken, isCorrect }
            };

            // Connect the host's socket to a room named after the PIN
            socket.join(pin);
            
            console.log(`Game created with PIN: ${pin}, Quiz: ${initialQuiz.title}`);
            socket.emit('gameCreated', { 
                pin, 
                hostToken, 
                qrDataUrl,
                settings,
                quizPacks: Object.values(quizPacks).map(q => ({ id: q.id, title: q.title, description: q.description, count: q.questions.length })),
                currentQuiz: {
                    id: selectedQuizKey,
                    title: initialQuiz.title,
                    questionsCount: quizQuestions.length,
                    questions: quizQuestions
                }
            });
        });

        // 1b. HOST updates game settings (timer, shuffles, streak, etc.)
        socket.on('hostUpdateSettings', (data) => {
            const { pin, settings } = data || {};
            const game = games[pin];
            if (!game || game.hostId !== socket.id || game.state !== 'lobby') return;

            game.settings = { ...game.settings, ...settings };
            console.log(`Updated settings for game ${pin}:`, game.settings);
            socket.emit('settingsUpdated', game.settings);
        });

        // 1c. HOST selects a different Quiz Pack or updates custom questions
        socket.on('hostSelectQuiz', (data) => {
            const { pin, quizId, customQuestions, quizTitle } = data || {};
            const game = games[pin];
            if (!game || game.hostId !== socket.id || game.state !== 'lobby') return;

            if (customQuestions && Array.isArray(customQuestions) && customQuestions.length > 0) {
                // Custom questions submitted
                game.quizId = 'custom';
                game.quizTitle = quizTitle || 'Custom Quiz';
                game.activeQuestions = JSON.parse(JSON.stringify(customQuestions));
            } else if (quizId && quizPacks[quizId]) {
                const preset = quizPacks[quizId];
                game.quizId = quizId;
                game.quizTitle = preset.title;
                game.activeQuestions = JSON.parse(JSON.stringify(preset.questions));
            }

            console.log(`Game ${pin} quiz updated to: ${game.quizTitle} (${game.activeQuestions.length} questions)`);

            socket.emit('quizUpdated', {
                quizId: game.quizId,
                quizTitle: game.quizTitle,
                questionsCount: game.activeQuestions.length,
                questions: game.activeQuestions
            });
        });

        // 1d. HOST kicks a player from lobby
        socket.on('hostKickPlayer', (data) => {
            const { pin, playerId, token } = data || {};
            const game = games[pin];
            if (!game || game.hostId !== socket.id) return;

            const playerIndex = game.players.findIndex(p => p.token === token || p.id === playerId);
            if (playerIndex === -1) return;

            const kickedPlayer = game.players[playerIndex];
            game.players.splice(playerIndex, 1);

            console.log(`Host kicked player ${kickedPlayer.name} from game ${pin}`);

            // Notify target socket
            io.to(kickedPlayer.id).emit('playerKicked', {
                message: 'You were removed from the lobby by the host.'
            });

            // Make the kicked socket leave the room
            const kickedSocket = io.sockets.sockets.get(kickedPlayer.id);
            if (kickedSocket) {
                kickedSocket.leave(pin);
            }

            // Update host UI
            socket.emit('playerKickedSuccess', {
                kickedPlayerId: kickedPlayer.id,
                kickedToken: kickedPlayer.token,
                remainingPlayers: game.players
            });
        });

        // 1e. HOST Reconnects after refresh or network hiccup
        socket.on('hostReconnect', (data) => {
            const { pin, hostToken } = data || {};
            const game = games[pin];

            if (!game || game.hostToken !== hostToken) {
                socket.emit('hostReconnectError', { message: 'Session expired or invalid token.' });
                return;
            }

            game.hostId = socket.id;
            game.hostConnected = true;
            socket.join(pin);

            console.log(`Host reconnected to game ${pin}`);

            const q = game.activeQuestions[game.currentQuestion];
            const isFinal = game.currentQuestion >= game.activeQuestions.length - 1;
            const topPlayers = [...game.players].sort((a, b) => b.score - a.score).slice(0, 5);

            socket.emit('hostStateRestored', {
                pin,
                state: game.state,
                players: game.players,
                settings: game.settings,
                quizId: game.quizId,
                quizTitle: game.quizTitle,
                qrDataUrl: game.qrDataUrl,
                currentQuestion: game.currentQuestion,
                totalQuestions: game.activeQuestions.length,
                question: q ? { 
                    text: q.text, 
                    answers: q.answers, 
                    correct: (game.state === 'questionResults' ? q.correct : undefined) 
                } : null,
                timeRemaining: game.timeRemaining,
                answersCount: game.answersCount,
                topPlayers,
                isFinal,
                quizPacks: Object.values(quizPacks).map(pack => ({ id: pack.id, title: pack.title, description: pack.description, count: pack.questions.length })),
                currentQuiz: {
                    id: game.quizId,
                    title: game.quizTitle,
                    questionsCount: game.activeQuestions.length,
                    questions: game.activeQuestions
                }
            });
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

            const playerToken = generateToken('ply');

            // Create the player object
            const player = { 
                id: socket.id,
                token: playerToken,
                name: name, 
                score: 0, 
                streak: 0,
                maxStreak: 0,
                correctCount: 0,
                totalAnsweredCount: 0,
                connected: true,
                avatar: data.avatar, 
                color: data.color,
                hasAnswered: false,
                lastPoints: 0,
                isCorrect: false
            };
            game.players.push(player);

            // Add the player to the Socket.IO room
            socket.join(pin);
            console.log(`Player ${name} joined game ${pin}`);
            
            // Tell the mobile screen they got in successfully with session token
            socket.emit('joinSuccess', {
                pin,
                token: playerToken,
                name: player.name,
                avatar: player.avatar,
                color: player.color
            });
            
            // Tell the Big Screen to add their name to the list
            io.to(game.hostId).emit('playerJoined', player);
        });

        // 2b. PLAYER Reconnects after refresh or lock screen
        socket.on('playerReconnect', (data) => {
            const { pin, token } = data || {};
            const game = games[pin];

            if (!game) {
                socket.emit('playerReconnectError', { message: 'Game no longer exists.' });
                return;
            }

            const player = game.players.find(p => p.token === token);
            if (!player) {
                socket.emit('playerReconnectError', { message: 'Player session not found.' });
                return;
            }

            player.id = socket.id;
            player.connected = true;
            socket.join(pin);

            console.log(`Player ${player.name} reconnected to game ${pin}`);

            // Update host on connection status
            io.to(game.hostId).emit('playerConnectionUpdate', {
                id: player.id,
                token: player.token,
                connected: true,
                name: player.name
            });

            // Get current question answers if device should show answer labels
            const currentQ = game.activeQuestions[game.currentQuestion];
            const answerLabels = (game.settings && game.settings.showAnswersOnDevice && currentQ) ? currentQ.answers : null;

            // Send restored state to player
            socket.emit('playerStateRestored', {
                pin,
                token: player.token,
                player: {
                    name: player.name,
                    score: player.score,
                    streak: player.streak,
                    avatar: player.avatar,
                    color: player.color
                },
                gameState: game.state,
                hasAnswered: player.hasAnswered,
                timeRemaining: game.timeRemaining,
                lastPoints: player.lastPoints,
                isCorrect: player.isCorrect,
                score: player.score,
                answerLabels: answerLabels,
                settings: {
                    showAnswersOnDevice: game.settings.showAnswersOnDevice
                }
            });
        });

        // 3. HOST starts the game
        socket.on('hostStartGame', () => {
            const pin = Object.keys(games).find(p => games[p].hostId === socket.id);
            if (!pin) return;
            
            const game = games[pin];
            if (game.players.length === 0) return;

            // Apply shuffles if configured
            if (game.settings.shuffleQuestions) {
                game.activeQuestions = shuffleArray(game.activeQuestions);
            }

            // If answer shuffle is enabled, shuffle answer order per question
            if (game.settings.shuffleAnswers) {
                game.activeQuestions.forEach(q => {
                    const originalAnswers = [...q.answers];
                    const correctAnswerText = originalAnswers[q.correct];
                    const shuffledAnswers = shuffleArray(originalAnswers);
                    q.answers = shuffledAnswers;
                    q.correct = shuffledAnswers.indexOf(correctAnswerText);
                });
            }

            game.currentQuestion = 0;
            startQuestion(pin, game);
        });

        // --- HELPER FUNCTIONS --- //
        function startQuestion(pin, game) {
            game.state = 'playing';

            const q = game.activeQuestions[game.currentQuestion];
            game.answersCount = 0;
            const timerSeconds = parseInt(game.settings.questionTimer) || 20;
            game.timeRemaining = timerSeconds;
            game.totalQuestionTime = timerSeconds;
            game.questionStartTime = Date.now();
            game.questionAnswersRecord = [];
            
            // Reset all players' answered status
            game.players.forEach(p => {
                p.hasAnswered = false;
                p.lastPoints = 0;
                p.isCorrect = false;
            });

            // Send question to Host
            io.to(game.hostId).emit('showQuestion', { 
                text: q.text, 
                answers: q.answers,
                questionIndex: game.currentQuestion,
                totalQuestions: game.activeQuestions.length,
                totalTime: timerSeconds,
                totalPlayers: game.players.filter(p => p.connected).length
            });

            // Send controller to Players (with answer choices if toggle enabled)
            io.to(pin).emit('showController', {
                answers: game.settings.showAnswersOnDevice ? q.answers : null,
                questionIndex: game.currentQuestion,
                totalQuestions: game.activeQuestions.length
            });

            if (game.timer) clearInterval(game.timer);

            // Start the countdown interval
            game.timer = setInterval(() => {
                game.timeRemaining--;
                io.to(game.hostId).emit('timerUpdate', game.timeRemaining);

                if (game.timeRemaining <= 0) {
                    clearInterval(game.timer);
                    endQuestion(pin, game);
                }
            }, 1000);
        }

        // PLAYER submits an answer
        socket.on('submitAnswer', (data) => {
            const { pin, answerIndex } = data;
            const game = games[pin];
            if (!game || game.state !== 'playing') return;

            const player = game.players.find(p => p.id === socket.id);
            if (!player || player.hasAnswered) return;

            player.hasAnswered = true;
            player.totalAnsweredCount++;
            game.answersCount++;

            const q = game.activeQuestions[game.currentQuestion];
            const timeTakenSec = Math.max(0.1, (Date.now() - game.questionStartTime) / 1000);

            const isCorrect = (answerIndex === q.correct);

            if (isCorrect) {
                player.correctCount++;
                const timerTotal = game.totalQuestionTime || 20;
                const speedFactor = Math.max(0, game.timeRemaining / timerTotal);
                const speedBonus = Math.round(speedFactor * 500);

                let streakBonus = 0;
                if (game.settings.streakBonus) {
                    player.streak = (player.streak || 0) + 1;
                    if (player.streak > (player.maxStreak || 0)) {
                        player.maxStreak = player.streak;
                    }
                    streakBonus = Math.min((player.streak - 1) * 75, 300);
                } else {
                    player.streak = 1;
                }

                player.lastPoints = 500 + speedBonus + streakBonus;
                player.score += player.lastPoints;
                player.isCorrect = true;
            } else {
                player.lastPoints = 0;
                player.streak = 0;
                player.isCorrect = false;
            }

            // Record response for analytics
            game.questionAnswersRecord.push({
                playerId: player.id,
                playerName: player.name,
                answerIndex: answerIndex,
                timeTakenSec: Number(timeTakenSec.toFixed(2)),
                isCorrect: isCorrect
            });

            // Live progress to host: answers received
            const connectedPlayers = game.players.filter(p => p.connected);
            const totalToAnswer = connectedPlayers.length || game.players.length;

            io.to(game.hostId).emit('updateAnswerCount', {
                count: game.answersCount,
                total: totalToAnswer
            });

            socket.emit('answerReceived');

            // Auto-advance to results if all connected players have answered
            if (game.answersCount >= totalToAnswer) {
                clearInterval(game.timer);
                endQuestion(pin, game);
            }
        });

        // Host clicks "Next"
        socket.on('hostNext', () => {
            const pin = Object.keys(games).find(p => games[p].hostId === socket.id);
            if (!pin) return;
            const game = games[pin];
            
            if (game.state === 'questionResults') {
                game.state = 'scoreboard';
                // Sort players by score highest to lowest, take top 5
                const topPlayers = [...game.players].sort((a, b) => b.score - a.score).slice(0, 5);
                const isFinal = game.currentQuestion >= game.activeQuestions.length - 1;

                io.to(game.hostId).emit('showScoreboard', topPlayers, isFinal);
                io.to(pin).emit('showWaitingScreen', { 
                    message: isFinal ? 'Calculating Final Results...' : 'Look at the Scoreboard!', 
                    color: '#46178f' 
                });
            } 
            else if (game.state === 'scoreboard') {
                game.currentQuestion++;
                if (game.currentQuestion < game.activeQuestions.length) {
                    startQuestion(pin, game);
                } else {
                    game.state = 'gameOver';
                    const finalRanking = [...game.players].sort((a, b) => b.score - a.score);
                    
                    // Host displays complete podium & rankings
                    io.to(game.hostId).emit('showGameOver', finalRanking);

                    // Send personalized report card to each player
                    finalRanking.forEach((p, idx) => {
                        const rank = idx + 1;
                        const totalQ = game.activeQuestions.length;
                        const correctQ = p.correctCount || 0;
                        const accuracyPct = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

                        io.to(p.id).emit('showGameOverPlayer', {
                            rank: rank,
                            totalPlayers: finalRanking.length,
                            score: p.score,
                            correctCount: correctQ,
                            totalQuestions: totalQ,
                            accuracyPct: accuracyPct,
                            maxStreak: p.maxStreak || 0,
                            top3: finalRanking.slice(0, 3).map(top => ({
                                name: top.name,
                                score: top.score,
                                avatar: top.avatar,
                                color: top.color
                            }))
                        });
                    });
                }
            }
        });

        // End question helper with Answer Distribution & Real-Time Analytics
        function endQuestion(pin, game) {
            game.state = 'questionResults';
            const q = game.activeQuestions[game.currentQuestion];

            // Calculate Answer Distribution [choice 0, choice 1, choice 2, choice 3]
            const distribution = [0, 0, 0, 0];
            let fastestResponder = null;
            let fastestTime = 9999;

            game.questionAnswersRecord.forEach(rec => {
                if (rec.answerIndex >= 0 && rec.answerIndex < 4) {
                    distribution[rec.answerIndex]++;
                }
                if (rec.isCorrect && rec.timeTakenSec < fastestTime) {
                    fastestTime = rec.timeTakenSec;
                    fastestResponder = {
                        name: rec.playerName,
                        timeSec: rec.timeTakenSec
                    };
                }
            });

            const totalAnswered = game.answersCount;
            const correctCount = distribution[q.correct] || 0;
            const accuracyPct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

            const percentages = distribution.map(count => {
                return totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
            });

            // Send full distribution analytics to Host
            io.to(game.hostId).emit('showCorrectAnswer', {
                correctIndex: q.correct,
                distribution: distribution,
                percentages: percentages,
                totalAnswered: totalAnswered,
                correctCount: correctCount,
                accuracyPct: accuracyPct,
                fastestResponder: fastestResponder
            });
            
            // Send personalized results to each player
            game.players.forEach(p => {
                let msg = "Time's Up!";
                let bgColor = '#46178f';
                
                if (p.hasAnswered) {
                    msg = p.isCorrect ? 'Correct!' : 'Incorrect!';
                    bgColor = p.isCorrect ? '#26890c' : '#eb2754';
                }
                
                io.to(p.id).emit('questionResult', { 
                    message: msg, 
                    points: p.lastPoints || 0, 
                    color: bgColor,
                    score: p.score,
                    isCorrect: p.isCorrect,
                    streak: p.streak || 0
                });
            });
        }
        
        socket.on('disconnect', () => {
            for (const pin in games) {
                const game = games[pin];
                if (game.hostId === socket.id) {
                    game.hostConnected = false;
                    console.log(`Host disconnected from game ${pin}`);
                    return;
                }

                const player = game.players.find(p => p.id === socket.id);
                if (player) {
                    player.connected = false;
                    console.log(`Player ${player.name} disconnected from game ${pin}`);
                    io.to(game.hostId).emit('playerConnectionUpdate', { 
                        id: player.id, 
                        token: player.token, 
                        connected: false,
                        name: player.name 
                    });
                    return;
                }
            }
        });
    });
};
