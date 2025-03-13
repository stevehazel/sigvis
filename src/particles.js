const particleColors = ['rgba(255, 0, 0, 0.1)', 'rgba(0, 255, 0, 0.2)'];


class Particle {
    constructor(x, y, radius, color, ctx, graph) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;

        this.ctx = ctx
        this.graph = graph
    }

    draw() {
        const ctx = this.ctx;
        const {x, y} = this.graph.screen2GraphCoords(this.x, this.y);

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    update() {
        const canvasWidth = window.innerWidth,
            canvasHeight = window.innerHeight;

        this.x += this.vx;
        this.y += this.vy;
        if (this.x - this.radius < 0 || this.x + this.radius > canvasWidth) {
            this.vx = -this.vx;
        }
        if (this.y - this.radius < 0 || this.y + this.radius > canvasHeight) {
            this.vy = -this.vy;
        }
    }

    isAlive() {
        return true;
    }
}


class Explosion {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.lifetime = 20;
        const particleSize = radius * 2; // Scale explosion particles with object size

        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                alpha: 0.5,
                size: particleSize,
            });
        }
    }

    draw() {
        const ctx = this.ctx;

        ctx.save();
        for (let particle of this.particles) {
            const {x, y} = this.graph.screen2GraphCoords(this.x + particle.x, this.y + particle.y);

            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
            ctx.arc(x, y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    update() {
        this.lifetime--;
        for (let particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha -= 0.025;
        }
        return this.lifetime > 0;
    }
}


export class ParticleLayer {
    graph = null;
    ctx = null

    constructor(graph) {
        this.graph = graph;

        this.init();
    }

    init() {
        console.log('init particles');
        this.particles = [];
        this.explosions = [];
    }

    setState(graph, ctx) {
        this.graph = graph;
        this.ctx = ctx;
    }

    addNewPair(radius) {
        // FIXME: translate coords
        const canvasWidth = window.innerWidth,
            canvasHeight = window.innerHeight;

        const particles = this.particles;

        particles.push(new Particle(
            Math.random() * canvasWidth,
            Math.random() * canvasHeight,
            radius,
            particleColors[0],
            this.graph,
            this.ctx
        ));

        particles.push(new Particle(
            Math.random() * canvasWidth,
            Math.random() * canvasHeight,
            radius,
            particleColors[1],
            this.graph,
            this.ctx
        ));
    }

    detectCollision(addNode) {
        const particles = this.particles;
        const explosions = this.explosions;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < p1.radius + p2.radius && p1.color !== p2.color) {
                    const collisionX = (p1.x + p2.x) / 2;
                    const collisionY = (p1.y + p2.y) / 2;

                    const radius = p1.radius;
                    
                    explosions.push(new Explosion(collisionX, collisionY, radius));
                    particles.splice(j, 1); // Remove p2 first (higher index)
                    particles.splice(i, 1); // Then p1

                    addNode({x: collisionX, y: collisionY}, false);
                    
                    addNewPair(radius);

                    return;
                }
            }
        }
    }

    update(targetParticles, radius) {
        const particles = this.particles;

        const canvasWidth = window.innerWidth,
            canvasHeight = window.innerHeight;

        // Spread the update over time to avoid the visual smearing of a heavy frame
        let numParticlesAdd = Math.min(10, targetParticles - particles.length);
        if (numParticlesAdd > 0) {
            if (numParticlesAdd % 2 == 1) {
                numParticlesAdd += 1;
            }

            for (let i = 0; i < numParticlesAdd; i++) {
                particles.push(new Particle(
                    Math.random() * canvasWidth,
                    Math.random() * canvasHeight,
                    radius,
                    particleColors[i % 2],
                    this.graph,
                    this.ctx
                ));
            }
        }
    }

    iter(collisionDetectionEnabled, addNode) {
        this.explosions = this.explosions.filter(exp => {
            exp.update();
            exp.draw();
            return exp.lifetime > 0;
        });

        this.particles = this.particles.filter(particle => {
            particle.update();
            particle.draw();
            return particle.isAlive();
        });

        if (collisionDetectionEnabled) {
            this.detectCollision(addNode);
        }
    }

    reset() {
        console.log('reset particles');
        this.init();
    }

}
