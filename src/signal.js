import { Identity } from './identity';

export class Signal {
    constructor(sourceNode, h, angle=null) {
        if (angle === null) {
            // Generate random direction
            angle = Math.random() * 2 * Math.PI;
        }

        this.source = sourceNode;
        this.cost = 1;
        this.identity = sourceNode.identity.clone();
        this.value = sourceNode.weights;
        this.x = sourceNode.x;
        this.y = sourceNode.y;
        this.angle = angle
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.max_h = h;
        this.h = h;
        this.ts = Date.now();
    }

    update(otherIdentity, nearnessFactor, targetID) {
        // Signal update
        this.identity.update(otherIdentity, nearnessFactor);
        this.identity.resolve(null);

        // Target update
        otherIdentity.update(this.identity, nearnessFactor);
        otherIdentity.resolve(targetID);
    }

    rayHit(targetNode) {
        const signal = this;

        // Calculate intersection with circle
        const dx = targetNode.x - signal.x;
        const dy = targetNode.y - signal.y;

        const a = (signal.dx * signal.dx) + (signal.dy * signal.dy);
        const b = 2 * ((dx * signal.dx) + (dy * signal.dy));
        const c = (dx * dx) + (dy * dy) - Math.pow(targetNode.radius, 2);
        const discriminant = (b * b) - 4 * a * c;

        if (discriminant < 0) {
            return false;
        }

        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t < 0) {
            return false;
        }

        return true;
    }
}

