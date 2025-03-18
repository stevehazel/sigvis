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
        this.angle = angle;
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.max_h = h;
        this.h = h;
        this.ts = Date.now();
    }

    cleanup() {}

    update(otherIdentity, nearnessFactor, targetID) {
        // Signal update
        this.identity.update(otherIdentity, nearnessFactor);
        this.identity.resolve(null);

        // Target update
        otherIdentity.update(this.identity, nearnessFactor);
        otherIdentity.resolve(targetID);
    }
}
