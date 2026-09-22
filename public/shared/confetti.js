/**
 * BrainBurst Confetti Celebration Engine
 * Pure Canvas particle system without external dependencies
 */
class ConfettiEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animId = null;
        this.colors = ['#eb2754', '#12b2e5', '#f2ce46', '#26890c', '#e91e63', '#9c27b0', '#ffffff'];
    }

    init() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'confetti-canvas';
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '99999';
            document.body.appendChild(this.canvas);

            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    launch(durationMs = 4000) {
        this.launchKahootCannons(durationMs);
    }

    launchKahootCannons(durationMs = 7000) {
        this.init();
        this.resize();
        this.stop();

        this.particles = [];
        const colors = ['#eb2754', '#12b2e5', '#f2ce46', '#26890c', '#e91e63', '#9c27b0', '#ffffff', '#ffd700'];

        const spawnBurst = (isLeft) => {
            const originX = isLeft ? window.innerWidth * 0.12 : window.innerWidth * 0.88;
            const originY = window.innerHeight * 0.95;
            const count = 90;

            for (let i = 0; i < count; i++) {
                // Angle towards center: Left fires 50-80 deg, Right fires 100-130 deg
                const baseAngle = isLeft ? (-65 + (Math.random() - 0.5) * 35) : (-115 + (Math.random() - 0.5) * 35);
                const rad = (baseAngle * Math.PI) / 180;
                const speed = 16 + Math.random() * 18;

                this.particles.push({
                    x: originX,
                    y: originY,
                    vx: Math.cos(rad) * speed,
                    vy: Math.sin(rad) * speed,
                    w: Math.random() * 11 + 6,
                    h: Math.random() * 7 + 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rotation: Math.random() * 360,
                    vRot: (Math.random() - 0.5) * 14,
                    flip: Math.random() * Math.PI * 2,
                    vFlip: 0.1 + Math.random() * 0.15,
                    gravity: 0.38 + Math.random() * 0.15,
                    drag: 0.982,
                    shape: Math.random() > 0.25 ? 'rect' : 'circle',
                    opacity: 1
                });
            }
        };

        // Initial double cannon blast
        spawnBurst(true);
        spawnBurst(false);

        // Secondary cannon waves at 1.2s and 2.4s for prolonged celebration
        setTimeout(() => { spawnBurst(true); }, 1200);
        setTimeout(() => { spawnBurst(false); }, 1600);
        setTimeout(() => { spawnBurst(true); spawnBurst(false); }, 2800);

        const startTime = Date.now();
        const render = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > durationMs && this.particles.length === 0) {
                this.stop();
                return;
            }

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.vx *= p.drag;
                p.vy = p.vy * p.drag + p.gravity;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.vRot;
                p.flip += p.vFlip;

                if (elapsed > durationMs - 1500) {
                    p.opacity = Math.max(0, (durationMs - elapsed) / 1500);
                }

                if (p.y > this.canvas.height + 40 || p.opacity <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate((p.rotation * Math.PI) / 180);
                this.ctx.scale(Math.cos(p.flip), 1);
                this.ctx.globalAlpha = p.opacity;
                this.ctx.fillStyle = p.color;

                if (p.shape === 'circle') {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                }
                this.ctx.restore();
            }

            if (this.particles.length > 0 || elapsed <= durationMs) {
                this.animId = requestAnimationFrame(render);
            } else {
                this.stop();
            }
        };

        this.animId = requestAnimationFrame(render);
    }

    stop() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

window.confettiEngine = new ConfettiEngine();
