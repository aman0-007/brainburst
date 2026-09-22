/**
 * BrainBurst Sound & Haptics Engine
 * Fully synthesized with the Web Audio API - zero external assets, zero latency.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('bb_muted') === 'true';
        this.lobbyLoopInterval = null;
        this.questionInterval = null;
        this.currentStep = 0;
        this.masterGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('bb_muted', this.muted);
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
        }
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }

    // Helper: Play a synthetic note
    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.3, startTime = null) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const start = startTime || this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(gainVal, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(start);
        osc.stop(start + duration);
    }

    // 1. Lobby Waiting Music (Upbeat electronic Kahoot-style bouncy loop)
    startLobbyMusic() {
        if (this.lobbyLoopInterval) return;
        this.init();

        const bassline = [130.81, 130.81, 155.56, 174.61, 130.81, 130.81, 196.00, 174.61]; // C3, C3, Eb3, F3, C3, C3, G3, F3
        const melody = [523.25, 0, 659.25, 587.33, 523.25, 0, 783.99, 659.25];
        let step = 0;

        const loop = () => {
            if (this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;

            // Bass synth
            const bassNote = bassline[step % bassline.length];
            if (bassNote > 0) {
                this.playTone(bassNote, 'sawtooth', 0.18, 0.22, now);
            }

            // High arp
            const leadNote = melody[step % melody.length];
            if (leadNote > 0 && Math.random() > 0.15) {
                this.playTone(leadNote, 'triangle', 0.14, 0.18, now);
            }

            // Snappy beat click
            if (step % 2 === 0) {
                this.playPercussion('hat', now);
            }
            if (step % 4 === 2) {
                this.playPercussion('snare', now);
            }

            step++;
        };

        this.lobbyLoopInterval = setInterval(loop, 240); // ~125 BPM 8th notes
    }

    stopLobbyMusic() {
        if (this.lobbyLoopInterval) {
            clearInterval(this.lobbyLoopInterval);
            this.lobbyLoopInterval = null;
        }
    }

    // 2. Question Countdown Ticking & Tension
    startCountdownMusic() {
        this.stopCountdownMusic();
        this.stopLobbyMusic();
        this.init();

        let pulse = 0;
        this.questionInterval = setInterval(() => {
            if (this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;
            
            // Alternating tension bass pulse
            const tensionFreq = (pulse % 2 === 0) ? 146.83 : 164.81; // D3 / E3
            this.playTone(tensionFreq, 'square', 0.15, 0.12, now);
            this.playPercussion('tick', now);
            pulse++;
        }, 500);
    }

    // Called every second by timer: speeds up tension when time <= 5
    updateTimerTick(timeRemaining) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (timeRemaining <= 5 && timeRemaining > 0) {
            // Intense fast double tick
            this.playTone(880 + (5 - timeRemaining) * 80, 'sine', 0.08, 0.35, now);
            this.playTone(1100 + (5 - timeRemaining) * 80, 'triangle', 0.06, 0.25, now + 0.1);
            this.triggerHaptic('tick');
        } else if (timeRemaining > 5) {
            this.playTone(440, 'triangle', 0.05, 0.15, now);
        }
    }

    stopCountdownMusic() {
        if (this.questionInterval) {
            clearInterval(this.questionInterval);
            this.questionInterval = null;
        }
    }

    // 3. Answer Button Click (Player buzzer tap)
    playAnswerClick() {
        this.init();
        this.triggerHaptic('tap');
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        this.playTone(587.33, 'triangle', 0.06, 0.4, now);
        this.playTone(880, 'sine', 0.1, 0.3, now + 0.04);
    }

    // 4. Correct Answer Stinger (Triumphant ascending fanfare)
    playCorrect() {
        this.init();
        this.triggerHaptic('correct');
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            this.playTone(freq, 'triangle', 0.22, 0.35, now + idx * 0.08);
            this.playTone(freq * 1.5, 'sine', 0.15, 0.15, now + idx * 0.08);
        });
    }

    // 5. Incorrect Answer Stinger (Dissonant descending buzz)
    playIncorrect() {
        this.init();
        this.triggerHaptic('incorrect');
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        this.playTone(220, 'sawtooth', 0.3, 0.35, now);
        this.playTone(207.65, 'sawtooth', 0.35, 0.35, now + 0.15); // G#3 (clash)
    }

    // 6. Time Up Sound
    playTimesUp() {
        this.init();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        this.playTone(330, 'sawtooth', 0.4, 0.3, now);
        this.playTone(293.66, 'sawtooth', 0.5, 0.25, now + 0.2);
    }

    // 7. Scoreboard Fanfare (Drumroll into brass fanfare)
    playScoreboardFanfare() {
        this.init();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        // Mini roll
        for (let i = 0; i < 8; i++) {
            this.playPercussion('snare', now + i * 0.05);
        }
        // Fanfare chord
        setTimeout(() => {
            if (this.muted || !this.ctx) return;
            const t = this.ctx.currentTime;
            this.playTone(440, 'sawtooth', 0.5, 0.25, t);
            this.playTone(554.37, 'sawtooth', 0.5, 0.25, t);
            this.playTone(659.25, 'sawtooth', 0.5, 0.25, t);
            this.playTone(880, 'triangle', 0.7, 0.35, t + 0.1);
        }, 420);
    }

    // 8. Game Over Grand Celebration
    playGameOverCelebration() {
        this.playChampionFanfare();
    }

    // Authentic Kahoot Podium Audio Suite
    playPodiumDrumroll(durationSec = 1.4) {
        this.init();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const steps = Math.floor(durationSec * 22);
        for (let i = 0; i < steps; i++) {
            const time = now + (i / steps) * durationSec;
            const progress = i / steps;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140 + Math.random() * 30, time);
            const volume = 0.04 + progress * 0.16;
            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + 0.04);
        }
    }

    playPillarLand() {
        this.init();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Punchy thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);

        // Snap clap
        this.playPercussion('snare', now);
    }

    playMedalChime(tier = 3) {
        this.init();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Chime frequencies based on podium tier
        const freqs = tier === 1 ? [523.25, 659.25, 783.99, 1046.50] :
                      tier === 2 ? [440.00, 554.37, 659.25, 880.00] :
                                   [392.00, 493.88, 587.33, 783.99];

        freqs.forEach((f, i) => {
            const t = now + i * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    }

    playChampionFanfare() {
        this.init();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Big fanfare melody in C major
        const notes = [
            { f: 523.25, d: 0.14 }, // C5
            { f: 523.25, d: 0.14 }, // C5
            { f: 523.25, d: 0.14 }, // C5
            { f: 659.25, d: 0.28 }, // E5
            { f: 783.99, d: 0.22 }, // G5
            { f: 659.25, d: 0.16 }, // E5
            { f: 783.99, d: 0.22 }, // G5
            { f: 1046.5, d: 0.95 }  // C6 (Triumphant hold!)
        ];

        let offset = 0;
        notes.forEach((n, idx) => {
            const t = now + offset;
            this.playTone(n.f, 'sawtooth', n.d, 0.35, t);
            this.playTone(n.f * 0.5, 'triangle', n.d, 0.28, t);
            this.playTone(n.f * 1.5, 'sine', n.d * 0.8, 0.12, t);
            offset += n.d * (idx === notes.length - 1 ? 1 : 0.88);
        });

        // Add cheering applause
        setTimeout(() => {
            this.playCrowdApplause();
        }, 300);
    }

    playCrowdApplause(durationSec = 2.5) {
        this.init();
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const claps = Math.floor(durationSec * 25);
        for (let i = 0; i < claps; i++) {
            const t = now + Math.random() * durationSec;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800 + Math.random() * 600, t);
            gain.gain.setValueAtTime(0.04 + Math.random() * 0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
        }
    }

    // Synthetic drum sounds
    playPercussion(type, time) {
        if (this.muted || !this.ctx) return;
        const now = time || this.ctx.currentTime;

        if (type === 'tick') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.03);
        } else if (type === 'snare') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'hat') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(8000, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.02);
        }
    }

    // Haptic Feedback API for mobile players
    triggerHaptic(type) {
        if (!('vibrate' in navigator)) return;
        try {
            if (type === 'tap') navigator.vibrate(30);
            else if (type === 'correct') navigator.vibrate([60, 40, 120]);
            else if (type === 'incorrect') navigator.vibrate([140, 60, 140]);
            else if (type === 'tick') navigator.vibrate(20);
        } catch (e) {
            // Ignore if disallowed by user/browser gesture policy
        }
    }
}

// Attach to window
window.soundEngine = new SoundEngine();
