import {
    choiceFrom,
    filledArray,
} from './utils';

import { Identity } from './identity';


const colors = [
    [0,255,0],
    [0,0,255],
    [255,0,0],
    /*[0,128,128],
    [0,0,0],
    [255,255,255],
    [255,255,0],
    [0,255,255],*/
];


export class Node {
    constructor(id) {
        this.id = id;
    }

    init(nodeStruct) {
        this.id = nodeStruct.id || this.id;
        this.x = nodeStruct.x;
        this.y = nodeStruct.y;
        this.weights = nodeStruct.weights || genWeights();

        this.setIdentity(nodeStruct.identity);

        this.radius = nodeStruct.radius || 30;
        this.color = nodeStruct.color || this.identity.toColor();

        this.health = nodeStruct.health;
        this.baseHealth = nodeStruct.baseHealth;

        this.level = nodeStruct.level || 1;
        this.containedNodes = nodeStruct.containedNodes || [];
        this.isContained = !!nodeStruct.isContained;
    }

    setIdentity(identityStruct) {
        if (identityStruct instanceof Identity) {
            this.identity = identityStruct;
        }
        else if (typeof identityStruct === 'object') {
            this.identity = new Identity(identityStruct);
        }
        else {
            this.identity = new Identity();
        }
    }

    serialize() {
        let nodeStruct = {}
        for (let key of Object.keys(this)) {
            if (!this.hasOwnProperty(key)) {
                continue;
            }
            if (typeof this[key] === 'function') {
                continue;
            }
            if (this[key] instanceof Identity) {
                nodeStruct[key] = {
                    id: this[key].id,
                }
            }
            else {
                nodeStruct[key] = this[key]
            }
        }
        return nodeStruct
    }

    getColor() {
        const r = this.weights[0];
        const g = this.weights[1];
        const b = this.weights[2];

        return `rgba(${r},${g},${b}, 1.0)`;
    }

    countSignals(node, nodeIdx) {
        node = node || this
        let count = 0
        if (node.containedNodes?.length) {
            node.containedNodes.forEach(containedNodeID => {
                const nextNode = nodeIdx[containedNodeID]
                if (nextNode) {
                    count += this.countSignals(nextNode, nodeIdx)
                }
            })
        }
        else {
            count = 1
        }
        return count
    }

    interact(signal, nearnessFactor) {
        // Given a signal, update it with own identity
        // Presume nearness has been calculated sensibly

        signal.update(this.identity, nearnessFactor)

        /*// Also update own identity, inasmuch as that's possible
        this.identity.update(signal, nearnessFactor)
        this.identity.resolve();*/

    }

    distanceTo(other) {
        const otherRadius = other.radius || 1;
        const ownRadius = this.radius || 1;

        const distanceBetweenCenter = Math.pow(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2), 0.5);
        const distance = Math.max(0, distanceBetweenCenter - otherRadius - ownRadius);

        return distance
    }

    initInterior(SSEngine, el) {
        if (!this.el) {
            const nodeBaseEl = document.createElement('div');

            // Gets weird if not attached to DOM
            document.querySelector('#container').append(nodeBaseEl);
            this.el = nodeBaseEl;

            nodeBaseEl.style.position = 'absolute';
            nodeBaseEl.style.right = '0px';
            nodeBaseEl.style.top = '-1000px';
            nodeBaseEl.style.width = '400px';
            nodeBaseEl.style.height = '400px';

            this.SS = new SSEngine(nodeBaseEl);
            this.SS.init({
            });

            this.SS.graph.width(400);
            this.SS.graph.height(400);

            this.SS.NUM_NODES = 5;
            this.SS.BASE_NODE_RADIUS = 100;
            this.SS.MAX_GROUP_LEVELS = 1;
            this.SS.lastNodeID = 100000; //hack?

            this.SS.addNode({}, false);
            this.SS.addNode({}, false);
            this.SS.addNode({}, false);
            this.SS.addNode({}, false);

            this.SS.updateGraph();

            this.SS.startSim();
        }
    }

    renderInterior(destCtx, destX, destY, destWidth, orig) {
        if (!this.SS?.ctx || !this.SS?.GLOBAL_SCALE) {
            return;
        }

        this.maskCanvas = this.maskCanvas || document.createElement('canvas');
        copyCanvas(this.SS.ctx, destCtx, destX, destY, destWidth, this.maskCanvas);
    }
}


function genWeights() {
    return choiceFrom(colors).concat(filledArray(5, 256))
}


function copyCanvas(sourceCtx, destCtx, x, y, destWidth, tmpCanvas) {
    const sourceCanvas = sourceCtx.canvas;

    // Calculate proportional height based on source canvas aspect ratio
    const destHeight = (sourceCanvas.height * destWidth) / sourceCanvas.width;

    tmpCanvas.width = sourceCanvas.width;
    tmpCanvas.height = sourceCanvas.height;
    const tmpCtx = tmpCanvas.getContext('2d');

    tmpCtx.beginPath();
    tmpCtx.arc(200, 200, 200 * 0.975, 0, Math.PI * 2);
    tmpCtx.closePath();
    tmpCtx.fillStyle = 'black';
    tmpCtx.fill();
    tmpCtx.globalCompositeOperation = 'source-in';
    tmpCtx.drawImage(sourceCanvas, 0, 0);

    destCtx.drawImage(tmpCanvas, x, y, destWidth, destHeight);
    tmpCanvas.remove();
}
