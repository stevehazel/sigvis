import {
    calcArea,
    blendColors,
    createCanvasThumbnail,
    choiceFrom,
    filledArray,
    calculateTotalAreaRadius,
} from './utils';

import { Node } from './node';
import { Signal } from './signal';
import { genIdentity_Color } from './identity';


export class SignalEngine {
    lastNodeID = 100;

    BASE_NODE_RADIUS = 30;

    GLOBAL_SCALE = 1;

    LINKING_ENABLED = true;
    LINKS_WEAK_VISIBLE = false;
    LINKS_STRONG_VISIBLE = true;
    LINKS_PERMA_VISIBLE = true;

    GREEDY_REMOVAL = false;

    EMITS_VISIBLE = false;
    BACKGROUND_ENABLED = false;

    NUM_NODES = 50;
    MAX_GROUP_LEVELS = 3;
    EMIT_RATE = 0.02;
    DECAY_RATE = 0.05;

    DECAY_RATE_OVERRIDE = false;
    PARTICLE_DENSITY = 100000;

    RENDER_CELLS = false;

    NODE_GROUP_THRESHOLD = 3;    
    NODE_HEALTH = 200;
    NODE_HEALTH_VISIBLE = true;
    SIGNAL_WEIGHT = 100;
    SIGNAL_COST = 1;

    EMIT_LENGTH_MULTIPLIER = 4;
    EMIT_LENGTH_DISTANCE = false;
    EMIT_WIDTH_MULTIPLIER = 1;
    EMIT_OPACITY_MULTIPLIER = 1;

    LINK_STRONG = 10000; // should be proportional to max-similarity strength value
    LINK_PERMA_BOND = true;
    LINK_PERMA_BOND_THRESHOLD = this.LINK_STRONG * 10;

    MIN_VISIBLE_LEVEL = 1;

    constructor() {
        this.nodeIdx = [];
        this.links = [];
        this.emits = [];
    }

    setData(nodeIdx, links) {
        this.nodeIdx = nodeIdx;
        this.links = links;
    }

    resetData() {
        this.nodeIdx = {};
        this.links = [];
        this.emits = [];
    }

    getData() {
        return {
            nodes: Object.values(this.nodeIdx),
            links: this.links
        }
    }

    init(config = {}) {
        this.reset();
        this.INITIALIZED = true;
    }

    
    control(action, v, w) {
        if (action == 'config') {
            Object.entries(v).forEach(([configID, val]) => {
                this[configID] = val;
            });
        }
        else if (action == 'emitRate') {
            v = Math.min(20, Math.max(1, v));
            this.EMIT_RATE = v / 100;
        }
        else if (action == 'toggleLinking') {
            this.LINKING_ENABLED = !this.LINKING_ENABLED;
        }
        else if (action == 'toggleEmits') {
            this.EMITS_VISIBLE = !this.EMITS_VISIBLE;
        }
    }

    tick() {
        try {
            const beginTime = Date.now()
            const numNodes = Object.values(this.nodeIdx).filter(n => !n.isContained).length;

            this.emitSignal();

            if (this.LINKING_ENABLED) {
                this.decayLinks();

                if (Math.random() < 0.1) {
                    this.mergeDenseNode();
                }
            }
        }
        catch (e) {
            // Useful if hot-reloading when animate() hasn't finished yet
            console.log('caught error', e);
        }
    }

    reset() {
        this.resetData();
    }

    createNode(id = null, x = null, y = null) {
        if (id === null) {
            this.lastNodeID += 1;
            id = this.lastNodeID;
        }

        if (x === null) {
            x = (Math.random() * window.innerWidth) - (window.innerWidth / 2);
        }

        if (y === null) {
            y = (Math.random() * window.innerHeight) - (window.innerHeight / 2);
        }

        const node = new Node(id)
        node.init({
            x,
            y,
            baseHealth: this.NODE_HEALTH,
            health: this.NODE_HEALTH,
            radius: this.BASE_NODE_RADIUS,
        });
        
        this.nodeIdx[node.id] = node;
        return node;
    }

    emitSignal(METHOD = 2) {
        const nodes = Object.values(this.nodeIdx).filter(n => !n.isContained)
        nodes.forEach(sourceNode => {
            // Random emission chance
            if (Math.random() >= this.EMIT_RATE) {
                return;
            }

            const numSignals = sourceNode.countSignals(null, this.nodeIdx);
            const signals = Array(numSignals).fill().map(() => {
                if (!sourceNode.identity) debugger
                const signal = new Signal(sourceNode, this.SIGNAL_WEIGHT);
                signal.cost = this.SIGNAL_COST;
                return signal;
            });

            /* Possibilities for groups:
              - crank up emit rate
                - hope it can get high enough

              - maintain depth-of-graph
                - heavy, but nice

              - generate multiple signals per iteration
                  - as in, one per contained node, adjusted
                  - seems like a reasonable way to get started
                    - get to depth-of-graph eventually
            */

            signals.forEach(signal => {
                sourceNode.health -= signal.cost;

                // Check for intersections
                let numHits = 0;
                let hitNodes = [];
                let nearestHit = null;

                nodes.forEach(target => {
                    if (target === sourceNode) {
                        return;
                    }

                    if (!signal.rayHit(target)) {
                        return
                    }

                    // Distance between node centers
                    let distance = Math.sqrt(
                        ((target.x - sourceNode.x) ** 2) + ((target.y - sourceNode.y) ** 2)
                    );

                    // Distance between node edges
                    distance -= sourceNode.radius
                    distance -= target.radius

                    // Positive distance (becomes negative when overlapping)
                    distance = Math.max(0, distance)

                    if (distance >= 0) {
                        hitNodes.push({
                            target,
                            distance
                        });
                    }

                    if (!nearestHit || distance < nearestHit.distance) {
                        nearestHit = {
                            target,
                            distance
                        }
                    }
                });

                if (this.EMITS_VISIBLE) {
                    if (!nearestHit) {
                        this.emits.push(signal);
                    }
                    else {
                        signal.hit = true;
                        signal.distance = nearestHit.distance;
                        this.emits.push(signal);
                    }
                }

                let newLinks = [];

                if (METHOD == 2)  {

                    /*
                    Method #2:
                        Signal interacts with every node hit by the ray

                            Nodes hit from nearest to farthest

                                QUESTION: Will they sort themselves like this if not otherwise taken into account?
                                    TEST: ignore distance
                                    TEST: apply all distortions at the same time and apply simultaneously

                            Signal distorts slightly as it passes near or through a node

                                QUESTION: Dynamic distortion?
                                    More for nearer? More if denser?

                            Those node identities are also distorted by the signal

                                QUESTION: To what degree?



                            QUESTIONS:
                                What is similarity in this case?
                                    presumably related to "resolve()" result

                                How does similarity relate to the adding/updating of a link?

                                    With more nodes hit and presumably less impact, is it worth generating a link?
                                        Might just be finer grained
                                        Might be more adding/removing

                                What is the basis for fine-bit vs coarse-bit biases?
                                    - is it simply the method of calculation?

                                Is there some sort of implicit or emergent effect that can be elicited?
                                    such that sorting & bonding happens but with 
                                        [including possibility of both impermeable and selective "membranes" or "markov blankets"]

                        Initial goal:
                            get a single calculation happening and step through it with the debugger

                    */

                    if (nearestHit) {
                        const { target, distance } = nearestHit;

                        let f = 1.0;
                        const diff = sourceNode.level - target.level;
                        if (diff > 0) {
                            // Source is bigger
                            f *= (diff + 1) ** 0.5;
                        }
                        else if (diff < 0) {
                            // Target is bigger
                            f /= (diff + 1) ** 0.5;
                        }

                        signal.update(target.identity, f, target.id);

                        target.color = target.identity.toColor();

                        let similarity = calcScore2(signal.identity, target.identity);
                        if (similarity <= 0) {
                            return;
                        }

                        if (this.LINKING_ENABLED) {
                            // Update or create link
                            const existingLink = this.links.find(l => 
                                (l.source.id === sourceNode.id && l.target.id === target.id)
                            );

                            if (existingLink) {
                                const updatedLinkStrength = (existingLink.strength || 0) + similarity;
                                if (this.LINK_PERMA_BOND && updatedLinkStrength >= this.LINK_PERMA_BOND_THRESHOLD) {
                                    existingLink.strength = this.LINK_PERMA_BOND_THRESHOLD;
                                    existingLink.permaBond = true;
                                }
                                else {
                                    existingLink.strength = updatedLinkStrength;
                                }
                            }
                            else {
                                // console.log(`adding new link from ${sourceNode.id} to ${target.id}`)

                                newLinks.push({
                                    source: sourceNode,
                                    target,
                                    strength: similarity,
                                    //curvature: 0.05,
                                });

                                /*console.log(`adding reciprocal link from ${target.id} to ${sourceNode.id}`)
                                newLinks.push({
                                    target,
                                    source: sourceNode,
                                    strength: similarity,
                                    curvature: -0.05,
                                    feedback: true,
                                });*/
                            }
                        }

                        sourceNode.health = Math.min(sourceNode.baseHealth, sourceNode.health + Math.pow(similarity, 0.25));
                        target.health = Math.min(target.baseHealth, target.health + Math.pow(similarity, 0.125));
                    }
                }

                if (METHOD == 1) {

                    /*
                    Method #1:
                        Signal hits only the nearest intersected node.
                            Reciprocal signal is presumed for a hit

                        Signal emits from the center of the node regardless of its radius or density

                        If signal is similar to the target, the link strength value becomes that similarity value.
                            Either create a new link or strengthen the existing link.

                        Increase the health of both source and target nodes.
                    */

                    if (nearestHit) {
                        const { target, distance } = nearestHit;

                        let similarity = calcScore(distance, signal.value, target.weights);
                        if (similarity <= 0) {
                            return;
                        }

                        if (this.LINKING_ENABLED) {
                            // Update or create link
                            const existingLink = this.links.find(l => 
                                (l.source.id === sourceNode.id && l.target.id === target.id)
                            );

                            if (existingLink) {
                                existingLink.strength = Math.min(this.LINK_STRONG * 2, (existingLink.strength || 0) + similarity);
                            }
                            else {
                                // console.log(`adding new link from ${sourceNode.id} to ${target.id}`)

                                newLinks.push({
                                    source: sourceNode,
                                    target,
                                    strength: similarity,
                                    curvature: 0.05,
                                });

                                /*console.log(`adding reciprocal link from ${target.id} to ${sourceNode.id}`)
                                newLinks.push({
                                    target,
                                    source: sourceNode,
                                    strength: similarity,
                                    curvature: -0.05,
                                    feedback: true,
                                });*/
                            }
                        }

                        sourceNode.health = Math.min(sourceNode.baseHealth, sourceNode.health + Math.pow(similarity, 0.25));
                        target.health = Math.min(target.baseHealth, target.health + Math.pow(similarity, 0.125));
                    };
                }

                // Inside the loop to ensure updates are available
                this.links = [...this.links, ...newLinks];
            });
        });

        Object.values(this.nodeIdx).forEach(node => {
            if (node.isContained) {
                return
            }

            if (node.health <= 0) {
                // Remove all the links to and from the node that has died
                this.links = this.links.filter(l => l.source.id !== node.id && l.target.id !== node.id);

                if (node.containedNodes?.length) {
                    this.downLevelNode(node);
                }

                delete this.nodeIdx[node.id]
            }
        });

        const now = Date.now();
        this.emits = this.emits.filter(signal => {
            if (signal.h <= 0 || now - signal.ts > 2000) {
                signal.identity = null;
                signal = null;

                return false;
            }
            return true;
        });
    }

    setMaxGroupLevels(maxLevels) {
        let dirty = false;

        if (maxLevels < this.MAX_GROUP_LEVELS) {
            // Check for nodes

            Object.values(this.nodeIdx).forEach(node => {
                if (node.isContained) {
                    return
                }

                if (node.level == this.MAX_GROUP_LEVELS && node.level > 1) {
                    // Remove all the links to and from the node
                    this.links = this.links.filter(l => l.source && l.target);
                    this.links = this.links.filter(l => l.source.id !== node.id && l.target.id !== node.id);

                    this.downLevelNode(node);
                    delete this.nodeIdx[node.id];

                    dirty = true;
                }
            });
        }

        this.MAX_GROUP_LEVELS = maxLevels;

        return dirty;
    }

    mergeDenseNode(debug = false) {
        const strongLink = this.LINK_STRONG,
            minStrongLinks = this.NODE_GROUP_THRESHOLD; // minimum connectivity

        let denseNode = null,
            denseLinks = null,
            maxStrong = 0;

        Object.values(this.nodeIdx).forEach(n => {
            if (n.isContained) {
                return
            }

            if (n.level >= this.MAX_GROUP_LEVELS) {
                return;
            }

            // has a lot of strong links of the self-same level
            const strongLinks = this.links.filter(link => {
                return link.source.id === n.id
                        && link.source.id !== link.target.id
                        && link.strength >= strongLink
                        && link.target.level === n.level;
            });

            if (strongLinks.length >= minStrongLinks && strongLinks.length > maxStrong) {
                maxStrong = strongLinks.length;
                denseLinks = strongLinks;
                denseNode = n;
            }
        })

        if (!denseNode) {
            return;
        }

        const affectedNodes = [
            denseNode,
            ...denseLinks.map(l => l.target),
        ]

        const colorList = affectedNodes.map(n => n.color);
        const containerColor = blendColors(colorList, true);

        // Create the container node
        const containerNode = this.createNode();

        // Set the container identity to a blend of its affected node's identities
        const identityDef = genIdentity_Color(containerColor);
        delete identityDef.a
        containerNode.setIdentity(identityDef);

        debug && console.log('denseNode', denseNode.id, 'containerNode', containerNode.id)

        containerNode.color = containerNode.identity.toColor();

        // Attach the node objects to the container
        containerNode.level = denseNode.level + 1;
        containerNode.containedNodes = affectedNodes.map(n => n.id);
        containerNode.radius = calculateTotalAreaRadius(affectedNodes.map(n => n.radius), containerNode.level);

        const baseHealth = affectedNodes.reduce((sum, affectedNode) => {
            return sum + affectedNode.baseHealth;
        }, 0);

        containerNode.baseHealth = baseHealth;
        containerNode.health = baseHealth;

        containerNode.x = denseNode.x;
        containerNode.y = denseNode.y;

        /* Issues:
            identity/weight is not updated on grouping
                not an issue if containers do not directly emit (proxy only)

            multiply link strength from containers?
                not if proxies
        */

        // Eliminate all links between the affected nodes
        this.links.forEach(link => {
            // Remove the link when its source and target are both affected nodes
            if (affectedNodes.includes(link.target) && affectedNodes.includes(link.source)) {
                this.links = this.links.filter(l => l !== link);  // Super inefficient

                debug && console.log(`remove link from ${link.source.id} to ${link.target.id}`);
            }
        });

        affectedNodes.forEach(affectedNode => {
            this.links.forEach(l => {
                if (l.target.id === affectedNode.id) {
                    // move all incoming links to affected nodes onto the container node

                    const existingLink = this.links.find(
                        lll => (lll.target.id === containerNode.id && lll.source.id === l.source.id)
                    );

                    if (existingLink) {
                        existingLink.strength = Math.min(this.LINK_STRONG * 2, (existingLink.strength || 0) + l.strength);

                        // Remove the duplicate link so it doesn't dangle
                        this.links = this.links.filter(lll => lll !== l);  // Super inefficient

                        debug && console.log(`updating in-link from ${l.source.id}/${l.target.id} to ${l.source.id}/${containerNode.id}`)
                    }
                    else {
                        l.target = containerNode;

                        debug && console.log(`shifting in-link from ${l.source.id}/${l.target.id} to ${l.source.id}/${containerNode.id}`)
                    }
                }
                else if (l.source.id === affectedNode.id) {
                    // move all outgoing links from affected nodes onto the container node

                    // Check for an existing link
                    // Its possible for multiple affected nodes to be linked outward to the same exterior node
                    //  So can't just naively re-map or that will create a duplicate link

                    const existingLink = this.links.find(
                        lll => (lll.source.id === containerNode.id && lll.target.id === l.target.id)
                    );

                    if (existingLink) {
                        existingLink.strength = Math.min(this.LINK_STRONG * 2, (existingLink.strength || 0) + l.strength);

                        // Remove the duplicate link so it doesn't dangle
                        this.links = this.links.filter(lll => lll !== l);  // Super inefficient

                        debug && console.log(`updating out-link from ${l.source.id}/${l.target.id} to ${containerNode.id}/${l.target.id}`)
                    }
                    else {
                        l.source = containerNode;
                        debug && console.log(`shifting out-link from ${l.source.id}/${l.target.id} to ${containerNode.id}/${l.target.id}`)
                    }
                }
            })

            affectedNode.isContained = true;
        });

        // Add the container node
        this.nodeIdx[containerNode.id] = containerNode;
    }

    decayLinks() {
        let keepLinks = [];
        this.links.forEach(link => {
            if (this.LINK_PERMA_BOND && link.permaBond) {
                return;
            }

            link.strength -= this.DECAY_RATE;

            if (link.strength <= 0) {
                link.strength = 0;
            }
        });

        this.links = this.links.filter(link => {
            return link.strength > 1;
        });
    }

    downLevelNode(containerNode) {
        // re-link to the world? not so far.
        // just linking together for now
        let newLinks = []

        containerNode.containedNodes.forEach(containedNodeID => {
            const containedNode = this.nodeIdx[containedNodeID]
            if (!containedNode || !containedNode.isContained) {
                //debugger
                return;
            }
            containedNode.x = containerNode.x;
            containedNode.y = containerNode.y;

            this.nodeIdx[containedNodeID] = containedNode;

            containerNode.containedNodes.forEach(peerNodeID => {
                if (containedNode.id === peerNodeID) return;

                const peerNode = this.nodeIdx[peerNodeID]
                newLinks.push({
                    source: containedNode,
                    target: peerNode,
                    strength: this.LINK_STRONG / 4,
                    curvature: 0,
                });
            })
        })

        // Cleanup all together afterward to avoid weirdness
        containerNode.containedNodes.forEach(containedNodeID => {
            const containedNode = this.nodeIdx[containedNodeID];
            if (containedNode) {
                containedNode.isContained = false;
            }
        })

        this.links = [...this.links, ...newLinks];
    }

    removeLeastConnectedNodes(numRemove) {
        const sortedNodeList = Object.values(this.nodeIdx)
            .filter(n => {
                if (n.isContained) {
                    return;
                }

                if (!this.GREEDY_REMOVAL && n.level > 1) {
                    // Skip containers until immediate re-connection is dealt with
                    return;
                }

                return true;
            })
            .map(n => {
                let linkStrength = 0;
                this.links.filter(link => {
                    if (!link.target) {
                        console.log('link.target missing for', link);
                        return
                    }
                    if (link.source.id === n.id || link.target.id === n.id) {
                        linkStrength += link.strength;
                    }
                });

                return {
                    linkStrength,
                    nodeID: n.id
                }
            })
            .sort((a, b) => {
                return b.linkStrength - a.linkStrength;
            });

        // Get the top N
        sortedNodeList
            .slice(0, numRemove)
            .forEach(s => {
                const nodeID = s.nodeID;
                this.links = this.links.filter(link => {
                    if (!link.target) {
                        console.log('link.target missing (2) for', link);
                        return
                    }
                    return link.source.id !== nodeID && link.target.id !== nodeID
                });

                delete this.nodeIdx[nodeID];
            });
    }
}


function calcScore(distance, signalValue, targetWeights) {
    /*

    */

    const maxDistance = Infinity;
    const distances = [60, 120, 250, 450, 650, 950, maxDistance];
    const numWeights = signalValue.length;
    const slotScaleMax = 256;

    let score = 0;
    distances.forEach((segmentDistance, idx) => {
        if (distance <= segmentDistance) {
            // Get to between 0 and 1 based on similarity of the slot's values
            //  - Room for improvement here?
            const slotSimilarity = (slotScaleMax - Math.abs(signalValue[idx] - targetWeights[idx])) / slotScaleMax;

            // Square root to amplify the large and diminish the small
            const scaledSlotSimilarity = Math.pow(slotSimilarity, 0.5);

            // Weight near distances significantly higher
            const slotScore = scaledSlotSimilarity * Math.pow(3, numWeights - idx);

            score += slotScore;
        }
    })

    return score;
}


function calcScore2(signalIdentity, targetIdentity) {
    /*

    */

    const sigLength = signalIdentity.sigLength;
    const slotScaleMax = 256;

    let score = 0;

    const c = signalIdentity.compareIdentity(targetIdentity);

    ['r', 'g', 'b'].forEach(cmp => {
        let cmpScore = 0

        if (false) {
            const similar = c[cmp].s;
            let cmpScore = 0

            for (let i = 0; i < sigLength; i++) {
                const cmpSlotScore = similar[i]; // * (2 ** ((sigLength - 1) - i));
                cmpScore += cmpSlotScore;
            }
        }
        else if (true) {
            // Simply count the number of similar bits
            // Gives equal weight to all
            // Does this effectively amplify the significance of the low bits?
            //  seems to, perceptually at least

            let numSimilar = c[cmp].s.reduce((sum, v) => { return sum + v; }, 0);
            cmpScore = 2 ** numSimilar;
        }

        score += cmpScore
    });

    score /= 3;
    score *= 30;

    return score;
}
