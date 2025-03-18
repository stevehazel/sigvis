import ForceGraph from 'force-graph';
import elementResizeDetectorMaker from 'element-resize-detector';

import {
    calcArea,
    blendColors,
    createCanvasThumbnail,
    JSONFromIDB,
    ToJSONIDB,
    delIDB,
} from './utils';

import { Node } from './node';

import {
    ParticleLayer,
} from './particles';

import { SignalEngine } from './engine.js'
import { UIConfig } from './uiconfig';

export class Canvas2D {
    RUN_ID = null;
    ZOOM_INTERVAL = null;
    lastAnimationFrame = null;

    BASE_NODE_RADIUS = 30;
    ZOOM_MIN_LINK_STRENGTH = 100;

    INITIALIZED = false;
    RUNNING = false;
    FIRST_RUN = true;

    AUTO_ZOOM = true;
    GLOBAL_SCALE = 1;

    LINKING_ENABLED = true;
    LINKS_WEAK_VISIBLE = false;
    LINKS_STRONG_VISIBLE = true;
    LINKS_PERMA_VISIBLE = true;

    GREEDY_REMOVAL = false;

    EMITS_VISIBLE = false;
    PRETTY_EMITS = false;
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

    constructor(el) {
        this.el = el
        this.BASE_PARTICLE_RADIUS = this.BASE_NODE_RADIUS * 0.5;

        this.drawingPaths = [];

        this.nodePaint = this.nodePaint.bind(this);
        this.linkColor = this.linkColor.bind(this);
        this.linkWidth = this.linkWidth.bind(this);
    }

    init(config = {}) {
        const el = this.el

        this.reset();
        const moduleId = 'Flat'

        this.RUN_ID = parseInt((Math.random() * 900000) + 100000);
        console.log('init signals', this.RUN_ID);

        this.engine = new SignalEngine();

        this.engine.rayHit = this.rayHit.bind(this);
        this.engine.calcNodeDistance = this.calcNodeDistance.bind(this);

        const graph = ForceGraph()(el);
        this.graph = graph;

        graph.enableZoomInteraction(false);
        graph.enablePanInteraction(false);
        graph.enablePointerInteraction(true);

        this.erd = elementResizeDetectorMaker();
        this.erd.listenTo(
            el,
            el => { 
                return graph.width(el.offsetWidth)
            }
        );

        // Prevent over-zooming
        graph.maxZoom(2)
        graph.minZoom(0.1)

        this.ZOOM_INTERVAL = setInterval(() => {
            if (this.AUTO_ZOOM && this.RUNNING) {
                this.zoomToFit();
            }
        }, 3000);

        graph
            .graphData(this.engine.getData())
            .nodeCanvasObject((node, ctx, globalScale) => {
                this.nodePaint(node, null, ctx, globalScale)
            })
            .nodePointerAreaPaint(this.nodePaint)
            .onRenderFramePre((ctx, globalScale) => {
                // Don't know a better way of getting the canvas context
                // Have to set ctx every frame because there's more than one of them

                this.ctx = ctx;
                this.canvasReady(ctx);
                if (this.particleLayer) {
                    this.particleLayer.setState(this.graph, ctx);
                }

                this.GLOBAL_SCALE = globalScale;
            });

        graph.onNodeClick(node => {
            console.log('node clicked', node);
        });

        graph.onBackgroundRightClick(e => {
            if (this.chunks) {
                // check chunk-state and inject at mouse position

                console.log('graph.onBackgroundRightClick', e)
                this.chunks.forEach(chunk => {
                    if (chunk.selected) {
                        console.log('chunk is selected', chunk.id)
                        this.injectChunk(chunk.id, {x: e.layerX, y: e.layerY});
                    }
                })
            }
        });

        graph.linkWidth(this.linkWidth);
        graph.linkColor(this.linkColor);

        graph.onBackgroundClick((e) => {
            return;
            
            /*if (this.AUTO_ZOOM) {
                this.AUTO_ZOOM = false;
            }
            else {
                this.zoomToFit(500);
                setTimeout(() => {
                    this.AUTO_ZOOM = true;
                }, 2000);
            }*/
        });

        graph.onZoom(({ k, x, y }) => {
            //this.AUTO_ZOOM = false
            if (this.AUTO_ZOOM) {
            }
        });

        const linkStrength = (link) => {
            return Math.min(Math.pow(link.strength, 0.5) / 1200, 1);
        }
        graph.d3Force('link').strength(linkStrength);

        graph.d3Force('link').distance((link, b, c) => {
            return (link.source.radius + link.target.radius) * 1.3;
        });

        const chargeForce = (node) => {
            return -30;
        }
        graph.d3Force('charge').strength(chargeForce);
        graph.d3Force('center', null);

        graph.linkCurvature('curvature');

        this.particleLayer = new ParticleLayer(this.graph);
        this.particleLayer.init();

        this.INITIALIZED = true;
        if (config.start) {
            this.RUNNING = true;
            this.animate();
            setTimeout(() => this.zoomToFit(500), 250);
        }

        this.FIRST_RUN = false;
    }

    calcNodeDistance(nodeA, nodeB) {
        return Math.sqrt(
            ((nodeA.x - nodeB.x) ** 2) + ((nodeA.y - nodeB.y) ** 2)
        );
    }

    rayHit(signal, targetNode) {
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

    linkWidth(link) {
        const maxWidth = Math.min(link.source.radius, link.target.radius) * 2 * this.GLOBAL_SCALE;

        if (this.LINK_PERMA_BOND && link.permaBond) {
            return maxWidth;
        }
        else if (link.strength >= this.LINK_STRONG) {
            if (!this.LINKS_STRONG_VISIBLE) {
                return null;
            }

            const sizeFactor = link.strength / this.LINK_PERMA_BOND_THRESHOLD,
                width = (maxWidth * 1) * sizeFactor;

            return width * 0.9;
        }
        else {
            if (!this.LINKS_WEAK_VISIBLE) {
                return null;
            }

            const sizeFactor = link.strength / this.LINK_STRONG,
                width = (maxWidth * 1) * sizeFactor;

            if (link.feedback) {
                return width ** 0.5;
            }

            return width;
        }
    }

    linkColor(link) {
        if (link.source.level < this.MIN_VISIBLE_LEVEL || link.target.level < this.MIN_VISIBLE_LEVEL) {
            return 'rgba(0,0,0,0)';
        }
        if (this.LINK_PERMA_BOND && link.permaBond) {
            if (this.LINKS_PERMA_VISIBLE) {
                const colorList = [link.source.color, link.target.color];
                const permaLinkColor = this.buildColor(blendColors(colorList, true));

                return permaLinkColor; //'rgba(255,165,0,0.85)';
            }
        }
        else if (link.strength >= this.LINK_STRONG) {
            if (this.LINKS_STRONG_VISIBLE) {
                return 'rgba(233,233,12,0.5)';
            }
        }
        else {
            if (this.LINKS_WEAK_VISIBLE) {
                return 'rgba(0,255,255,0.25)';
            }
        }
        return 'rgba(255,165,0,0)';
    }

    nodePaint(node, indexColor, ctx, globalScale) {
        const { x, y, radius, color } = node;

        if (node.level < this.MIN_VISIBLE_LEVEL) return
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = indexColor || color;
        ctx.fill();

        ctx.beginPath();

        if (this.NODE_HEALTH_VISIBLE) {
            const healthiness = Math.max(0, node.health / node.baseHealth);
            const threshold = 1.0;

                // 1.0 = perfect health, 0.0 = death's door

            if (healthiness < threshold) {
                ctx.arc(x, y, radius * (1 - (healthiness / threshold)), 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fill();
            }
        }

        if (false) {
            node.initInterior(SignalEngine);
            node.renderInterior(ctx, x - radius, y - radius, (radius * 2), {x, y, radius});
        }
    }

    canvasReady(ctx) {
        const canvas = ctx.canvas;

        if (!canvas.drawEventsBound) {
            canvas.drawEventsBound = true;

            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    this.drawingPaths = [];
                    this.drawShape();
                }
                else if (e.button === 2) { // Right click to start drawing
                    this.isDrawing = true;

                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    this.drawingPaths.push({
                        points: [{
                            x,
                            y,
                            timestamp: Date.now(),
                        }],
                        timestamp: Date.now()
                    });
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                if (this.isDrawing) {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const lastPath = this.drawingPaths[this.drawingPaths.length - 1];
                    if (lastPath) {
                        lastPath.timestamp = Date.now();
                        lastPath.points.push({
                            x,
                            y,
                            timestamp: Date.now(),
                        });
                        this.drawShape();
                    }
                }
            });

            canvas.addEventListener('mouseup', (e) => {
                if (e.button === 2) {
                    if (this.isDrawing) {
                        this.isDrawing = false;
                        this.drawShape();
                        this.extractNodes();
                    }
                }
            });

            // Prevent context menu on right click
            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }
    }

    extractNodes() {
        function isPointInPolygon(x, y, polygon) {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const xi = polygon[i].x;
                const yi = polygon[i].y;
                const xj = polygon[j].x;
                const yj = polygon[j].y;

                const intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;

        const lastPath = this.drawingPaths[this.drawingPaths.length - 1].points;
        const selectedNodes = []
        Object.values(this.engine.nodeIdx).forEach(node => {
            if (node.isContained) {
                return;
            }

            const screenCoords = this.graph.graph2ScreenCoords(node.x, node.y);
            if (isPointInPolygon(screenCoords.x, screenCoords.y, lastPath)) {
                selectedNodes.push(node);

                if (node.x - node.radius < minX) {
                    minX = node.x - node.radius;
                }
                else if (node.x + node.radius > maxX) {
                    maxX = node.x + node.radius;
                }

                if (node.y - node.radius < minY) {
                    minY = node.y - node.radius;
                }
                else if (node.y + node.radius > maxY) {
                    maxY = node.y + node.radius;
                }
            }
        });


        // FIXME: Don't save here.
        if (selectedNodes.length > 0) {

            if (selectedNodes.length == 1) {
                const selNode = selectedNodes[0];
                const dim = selNode.radius * 1.25 * this.GLOBAL_SCALE;
                minX = selNode.x - dim;
                maxX = selNode.x + dim;
                minY = selNode.y - dim;
                maxY = selNode.y + dim;
            }

            const nodeIdx = {};
            selectedNodes.forEach(node => {
                nodeIdx[node.id] = node;

                if (node.containedNodes?.length > 0) {
                    node.containedNodes.forEach(containedNodeID => {
                        nodeIdx[containedNodeID] = this.engine.nodeIdx[containedNodeID];
                    });
                }
            });

            // Have all the nodes, now grab all the links
            // Ignore links with a target node that isn't in this set

            const links = this.engine.links.filter(link => {
                return link.source.id in nodeIdx && link.target.id in nodeIdx;
            });

            this.saveChunk(
                {
                    nodes: Object.values(nodeIdx),
                    links,
                },
                null,
                {
                    width: Math.abs(maxX - minX),
                    height: Math.abs(maxY - minY),
                    ...this.graph.graph2ScreenCoords(minX, minY)
                });

            // FIXME: shouldn't be here
            this.chunkAdded();
        }
    }

    drawShape() {
        const ctx = this.ctx;
        const graph = this.graph;

        if (!graph) {
            return;
        }

        let drawingPaths = this.drawingPaths;
        if (!drawingPaths?.length) {
            return;
        }

        const now = Date.now();
        drawingPaths = drawingPaths.filter(path => (now - path.timestamp) < 4000);

        drawingPaths.forEach(path => {
            ctx.beginPath();

            const graphCoords = graph.screen2GraphCoords(path.points[0].x, path.points[0].y);
            ctx.moveTo(graphCoords.x, graphCoords.y);

            for (let i = 1; i < path.points.length; i++) {
                const graphCoords = graph.screen2GraphCoords(path.points[i].x, path.points[i].y);
                ctx.lineTo(graphCoords.x, graphCoords.y);
            }

            const age = now - path.timestamp;
            const alpha = 0.5 * (1 - age / 4000);
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha}`;

            ctx.lineWidth = 6 / this.GLOBAL_SCALE;
            ctx.stroke();
        });
    }

    stopSim() {
        this.RUNNING = false;
        if (this.lastAnimationFrame) {
            cancelAnimationFrame(this.lastAnimationFrame);
        }
    }

    startSim(config = {}) {
        if (this.RUN_ID === null) {
            this.init(config);
        }

        if (config.start !== false) {
            this.RUNNING = true;
            this.animate();
            setTimeout(() => this.zoomToFit(), 250);
        }
    }

    control(action, v, w) {
        if (action == 'start') {
            this.startSim(v);
        }
        else if (action == 'config') {
            Object.entries(v).forEach(([configID, val]) => {
                this[configID] = val;
                if (configID == 'EMITS_VISIBLE') {
                    this.engine.EMITS_ENABLED = val;
                }
            });
        }
        else if (action == 'showWeakLinks') {
            this.LINKS_WEAK_VISIBLE = true;
        }
        else if (action == 'hideWeakLinks') {
            this.LINKS_WEAK_VISIBLE = false;
        }
        else if (action == 'showStrongLinks') {
            this.LINKS_STRONG_VISIBLE = true;
        }
        else if (action == 'hideStrongLinks') {
            this.LINKS_STRONG_VISIBLE = false;
        }
        else if (action == 'numNodes') {
            this.NUM_NODES = v;
        }
        else if (action == 'emitRate') {
            v = Math.min(20, Math.max(1, v));
            this.EMIT_RATE = v / 100;
            this.engine.EMIT_RATE = this.EMIT_RATE;
        }
        else if (action == 'toggleBackground') {
            this.BACKGROUND_ENABLED = !this.BACKGROUND_ENABLED;
        }
        else if (action == 'toggleLinking') {
            this.LINKING_ENABLED = !this.LINKING_ENABLED;
            this.engine.LINKING_ENABLED = !this.engine.LINKING_ENABLED;
        }
        else if (action == 'toggleEmits') {
            this.EMITS_VISIBLE = !this.EMITS_VISIBLE;
            this.engine.EMITS_ENABLED = this.EMITS_VISIBLE;
        }

        if (this.INITIALIZED) {
            if (action == 'stop') {
                this.stopSim();
            }
            else if (action == 'reset') {
                this.reset();
            }
            else if (action == 'maxGroupLevels') {
                this.engine.setMaxGroupLevels(v);
            }
            else if (action == 'addNodes') {
                Array(v).fill().forEach(() => {
                    this.addNode({}, false);
                });

                this.updateGraph();
            }
            else if (action == 'pulse') {
                const currentLinkDecay = this.DECAY_RATE;

                this.DECAY_RATE_OVERRIDE = true;

                //const adj = w / 0.02
                this.DECAY_RATE = w;
                this.engine.DECAY_RATE = w;

                setTimeout(() => {
                    this.DECAY_RATE = currentLinkDecay;
                    this.engine.DECAY_RATE = currentLinkDecay;
                    this.DECAY_RATE_OVERRIDE = false;
                }, v * 1000);
            }
        }
    }

    async deleteSavedStates(stateID) {
        delIDB(`spooky-state-${stateID}`);

        let savedStates = await this.getSavedStates();
        delete savedStates[stateID];
        ToJSONIDB('spooky-saved-states', savedStates);
    }

    async getSavedStates() {
        return await JSONFromIDB('spooky-saved-states') || {};
    }

    async getSavedStateList() {
        let saved = await this.getSavedStates();
        const savedList = Object.keys(saved)
            .map(key => {
                return saved[key];
            })
            .sort((a, b) => {
                return b.ts - a.ts;
            });

        return savedList;
    }

    async deleteSavedChunk(chunkID) {
        delIDB(`spooky-chunk-${chunkID}`);

        let savedChunks = await this.getSavedChunks();
        delete savedChunks[chunkID];
        ToJSONIDB('spooky-saved-chunks', savedChunks);
    }

    async getSavedChunks() {
        return await JSONFromIDB('spooky-saved-chunks') || {};
    }

    async getSavedChunkList() {
        let saved = await this.getSavedChunks();
        const savedList = Object.keys(saved)
            .map(key => {
                saved[key].selected = false;
                return saved[key];
            })
            .sort((a, b) => {
                return b.ts - a.ts;
            });

        return savedList;
    }

    async saveChunk(sourceData, chunkID = null, sourceDim = null) {
        chunkID = chunkID || 'chunk-' + parseInt((Math.random() * 9000000) + 1000000).toString();

        let thumbnailDataUrl = null
        if (sourceDim) {
            thumbnailDataUrl = createCanvasThumbnail(this.ctx, 100, sourceDim);
        }

        let savedChunks = await this.getSavedChunks();
        savedChunks[chunkID] = {
            id: chunkID,
            ts: Date.now(),
            thumbnail: thumbnailDataUrl,
        }

        const newChunk = {
            links: sourceData.links.map(l => {
                delete l.index;
                return {
                    ...l,
                    source: l.source.id,
                    target: l.target.id,
                }
            }),
            nodes: sourceData.nodes.map(node => {
                return node.serialize();
            }),
        }

        ToJSONIDB(`spooky-chunk-${chunkID}`, newChunk);
        ToJSONIDB('spooky-saved-chunks', savedChunks);
    }

    async injectChunk(chunkID, screenPos) {
        chunkID = chunkID;

        screenPos = screenPos || {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight
        }

        const graphPos = this.graph.screen2GraphCoords(screenPos.x, screenPos.y);

        const chunkData = await this.loadChunk(chunkID);

        const numCurrentNodes = Object.keys(this.engine.nodeIdx).length;
        const numChunkNodes = Object.values(chunkData.nodeIdx).filter(n => !n.isContained).length;

        if (numCurrentNodes + numChunkNodes > this.NUM_NODES) {
            UIConfig.updateValue('Base', 'numNodes', this.NUM_NODES + numChunkNodes)
            //this.NUM_NODES += numChunkNodes;
        }

        function calculateCentroid(coords) {
            const n = coords.length;
            if (n === 0) return { x: 0, y: 0 };

            const sum = coords.reduce((acc, curr) => ({
                x: acc.x + curr.x,
                y: acc.y + curr.y
            }), { x: 0, y: 0 });

            return { x: sum.x / n, y: sum.y / n };
        }

        const chunkCentroid = calculateCentroid(Object.values(chunkData.nodeIdx).filter(n => !n.isContained));
        const diffX = graphPos.x - chunkCentroid.x,
            diffY = graphPos.y - chunkCentroid.y;

        Object.values(chunkData.nodeIdx).forEach(n => {
            // doesn't matter if contained get updated

            n.x += diffX;
            n.y += diffY;
        })

        this.engine.nodeIdx = {
            ...this.engine.nodeIdx,
            ...chunkData.nodeIdx
        }

        this.engine.links = [...this.engine.links, ...chunkData.links];
        this.updateGraph();
    }

    async loadChunk(chunkID) {
        let chunk = await JSONFromIDB(`spooky-chunk-${chunkID}`);
        if (!chunk) {
            return;
        }

        const nodeIDMap = {};

        const nodeIdx = {};
        chunk.nodes.forEach(nodeStruct => {
            let origNodeID = nodeStruct.id;

            // Remap all the IDs to ensure they are unique and within the allocated range
            //if (origNodeID in this.engine.nodeIdx || origNodeID > this.engine.lastNodeID) {
                // Ensure unique IDs

            // FIXME
            this.engine.lastNodeID += 1;
            const newNodeID = this.engine.lastNodeID;

            nodeIDMap[origNodeID] = newNodeID;
            nodeStruct.id = newNodeID;

            const node = new Node();
            node.init(nodeStruct);
            nodeIdx[node.id] = node;
        })

        const links = chunk.links
            .map(l => {
                const sourceNodeID = nodeIDMap[l.source] || l.source;
                const targetNodeID = nodeIDMap[l.target] || l.target;

                let source = nodeIdx[sourceNodeID],
                    target = nodeIdx[targetNodeID];

                if (source && target) {
                    return {
                        ...l,
                        source,
                        target,
                    }
                }
            })
            .filter(l => !!l);

        return {
            nodeIdx,
            links
        }
    }

    async save(stateID) {
        let wasRunning = this.RUNNING;
        if (wasRunning) {
            this.stopSim();
        }

        stateID = stateID || parseInt((Math.random() * 9000000) + 1000000).toString();

        const ctx = this.ctx;
        const thumbnailDataUrl = createCanvasThumbnail(ctx);

        let savedStates = await this.getSavedStates();
        savedStates[stateID] = {
            id: stateID,
            ts: Date.now(),
            thumbnail: thumbnailDataUrl,
        }

        const engineData = this.engine.getData();

        const newState = {
            config: {
                NUM_NODES: this.NUM_NODES,
                EMIT_RATE: this.EMIT_RATE,
                LINKS_WEAK_VISIBLE: this.LINKS_WEAK_VISIBLE,
                LINKS_STRONG_VISIBLE: this.LINKS_STRONG_VISIBLE,
                EMITS_VISIBLE: this.EMITS_VISIBLE,
                BACKGROUND_ENABLED: this.BACKGROUND_ENABLED,
                MAX_GROUP_LEVELS: this.MAX_GROUP_LEVELS,
                DECAY_RATE: this.DECAY_RATE,
                LINKING_ENABLED: this.LINKING_ENABLED,
            },
            canvas: {
                transform: ctx.getTransform(),
            },
            links: engineData.links.map(l => {
                delete l.index;
                return {
                    ...l,
                    source: l.source.id,
                    target: l.target.id,
                }
            }),
            nodes: engineData.nodes.map(node => {
                return node.serialize();
            }),
        }
        
        ToJSONIDB(`spooky-state-${stateID}`, newState);
        ToJSONIDB('spooky-saved-states', savedStates);

        if (wasRunning) {
            this.startSim();
        }
    }

    async load(el, stateID) {
        let savedState = await JSONFromIDB(`spooky-state-${stateID}`);
        if (!savedState) {
            return;
        }

        this.init(el, {start: false});

        const nodeIdx = [];
        savedState.nodes.forEach(nodeStruct => {
            const node = new Node();
            node.init(nodeStruct);
            nodeIdx[node.id] = node;
        })

        const links = savedState.links
            .map(l => {
                let source = nodeIdx[l.source],
                    target = nodeIdx[l.target];

                if (source && target) {
                    return {
                        ...l,
                        source,
                        target,
                    }
                }
            })
            .filter(l => !!l);

        this.engine.setData(nodeIdx, links);

        this.NUM_NODES = savedState.config.NUM_NODES;
        this.EMIT_RATE = savedState.config.EMIT_RATE;

        this.LINKS_STRONG_VISIBLE = savedState.config.LINKS_STRONG_VISIBLE;
        if ('LINKS_VISIBLE' in savedState.config) {
            this.LINKS_WEAK_VISIBLE = savedState.config.LINKS_VISIBLE;
        }
        else {
            this.LINKS_WEAK_VISIBLE = savedState.config.LINKS_WEAK_VISIBLE;
        }

        if ('EMITS_ENABLED' in savedState.config) {
            this.EMITS_VISIBLE = savedState.config.EMITS_ENABLED;
            this.engine.EMITS_ENABLED = this.EMITS_VISIBLE;
        }
        else {
            this.EMITS_VISIBLE = savedState.config.EMITS_VISIBLE;
            this.engine.EMITS_ENABLED = this.EMITS_VISIBLE;
        }

        this.BACKGROUND_ENABLED = savedState.config.BACKGROUND_ENABLED;
        this.LINKING_ENABLED = savedState.config.LINKING_ENABLED;
        this.MAX_GROUP_LEVELS = savedState.config.MAX_GROUP_LEVELS;
        this.DECAY_RATE = savedState.config.DECAY_RATE;

        const ctx = this.ctx
        ctx && ctx.setTransform(savedState.canvas.transform);

        this.updateGraph();
        setTimeout(() => this.zoomToFit(500), 250);

        return this;
    }

    animate() {
        if (!this.RUNNING) {
            return;
        }

        if (this.FIRST_RUN) {
            if (this.RUN_ID === null) debugger
            console.log('Start anim', this.RUN_ID);
        }

        try {
            const beginTime = Date.now()

            const numNodes = Object.values(this.engine.nodeIdx).filter(n => !n.isContained).length;

            if (this.BACKGROUND_ENABLED && this.GLOBAL_SCALE >= 0.2) {
                if (Math.random() < 0.1 || this.FIRST_RUN) {
                    const boundingBox = this.graph.getGraphBbox();
                    const area = calcArea();
                    const targetParticles = parseInt(area / this.PARTICLE_DENSITY);
                    this.particleLayer.update(targetParticles, this.BASE_PARTICLE_RADIUS);
                }
                this.particleLayer.iter(numNodes < this.NUM_NODES, (pos) => this.addNode(pos, false));
            }
            else {
                if (numNodes < this.NUM_NODES) {
                    const count = parseInt(Math.max(1, (this.NUM_NODES - numNodes) * 0.02));
                    for (let i = 0; i < count; i++) {
                        this.addNode({}, false);
                    }
                }
                else if (numNodes > this.NUM_NODES) {
                    const count = parseInt(Math.max(1, (numNodes - this.NUM_NODES) * 0.1));
                    this.engine.removeLeastConnectedNodes(count);
                }
            }

            this.engine.tick();

            if (this.LINKING_ENABLED) {
                if (Math.random() < 0.01 && !this.DECAY_RATE_OVERRIDE) {
                    this.updateDecayRate();
                    this.engine.DECAY_RATE = this.DECAY_RATE;
                }
            }

            if (this.EMITS_VISIBLE) {
                this.renderEmits();
            }
            this.updateGraph();

            /*fps.push(Date.now() - beginTime)
            if (fps.length == 60) {
                let total = fps.reduce((sum, frameTime) => {
                    return sum + frameTime;
                }, 0);
                //console.log('time for 60 frames', total, Object.keys(this.engine.nodeIdx).length)
                fps = []
            }*/

            this.drawShape();
        }
        catch (e) {
            // Useful if hot-reloading when animate() hasn't finished yet
            console.log('caught error', e);
        }

        if (this.RUNNING) {
            if (this.RENDER_CELLS) {
                //this.cellRenderer();
            }

            this.lastAnimationFrame = requestAnimationFrame(() => this.animate());
        }
        else {
            console.log('Stop anim', this.RUN_ID);
        }
    }

    reset() {
        this.RUNNING = false;
        this.FIRST_RUN = true;

        if (this.engine) {
            this.engine.reset();
        }

        clearInterval(this.ZOOM_INTERVAL);
        cancelAnimationFrame(this.lastAnimationFrame);

        try {
            this.erd.removeAllListeners(this.el);
            this.erd.uninstall(this.el);
        }
        catch (e) {};

        this.particleLayer?.reset();

        const graph = this.graph;
        if (graph) {
            const ctx = this.ctx
            if (ctx) {
                ctx.setTransform();
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            } 

            graph.graphData(this.engine.getData());
            graph.pauseAnimation();
        }

        this.graph = null;

        console.log(`reset signals, RunID done: ${this.RUN_ID}`);
        this.RUN_ID = null;
        this.INITIALIZED = false;
    }

    zoomToFit(zoomDuration) {
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;

        let minX_r = Infinity,
            maxX_r = -Infinity,
            minY_r = Infinity,
            maxY_r = -Infinity;

        const nodeLinkMap = {};
        this.engine.links.forEach(link => {
            const sourceNodeID = link.source.id;
            if (!(sourceNodeID in nodeLinkMap)) {
                nodeLinkMap[sourceNodeID] = [];
            }

            nodeLinkMap[sourceNodeID].push(link);
        })

        this.zoomFilterIn = {};
        this.zoomNumNodes = 0;

        Object.entries(this.engine.nodeIdx).forEach(([id, node]) => {
            if (node.isContained) return;
            this.zoomNumNodes += 1

            if (node.x < minX) {
                minX = node.x;
            }
            else if (node.x > maxX) {
                maxX = node.x;
            }

            if (node.y < minY) {
                minY = node.y;
            }
            else if (node.y > maxY) {
                maxY = node.y;
            }

            if (node.x - node.radius < minX_r) {
                minX_r = node.x - node.radius;
            }
            else if (node.x + node.radius > maxX_r) {
                maxX_r = node.x + node.radius;
            }

            if (node.y - node.radius < minY_r) {
                minY_r = node.y - node.radius;
            }
            else if (node.y + node.radius > maxY_r) {
                maxY_r = node.y + node.radius;
            }

            const outLinks = nodeLinkMap[node.id];
            if (!outLinks) {
                return
            }

            if (outLinks?.length || node.containedNodes?.length) {
                if (outLinks.find(l => l.strength >= this.ZOOM_MIN_LINK_STRENGTH)) {
                    this.zoomFilterIn[node.id] = true;
                }
            }
        });

        const w_r = maxX_r - minX_r,
            h_r = maxY_r - minY_r,
            w = maxX - minX,
            h = maxY - minY;

        const diffWidth = w_r / w,
            diffHeight = h_r / h;

        const adj = Math.max(diffWidth, diffHeight);
        const viewportMargin = 0.05; // percentage of total
        const viewportSize = ((window.innerWidth + window.innerHeight) / 2);
        const baseMargin = viewportSize * viewportMargin;

        let adjMargin = 0;
        if (this.zoomNumNodes > 20) {
            adjMargin = viewportSize * (adj - 1);
        }

        this.graph.zoomToFit(
            zoomDuration || 2000,
            Math.max(baseMargin, adjMargin),
            (node) => this.zoomFilter(node)
        );
    }

    zoomFilter(node) {
        if (this.zoomNumNodes <= 20) {
            return true;
        }
        return node.id in this.zoomFilterIn;
    }

    addNode({x, y}, inBounds = true) {
        let graphX, graphY;

        const boundingBox = this.graph.getGraphBbox();
        if (inBounds && boundingBox) {
            // Add to a random position inside the graph's bounding box

            const originX = boundingBox.x[0];
            const originY = boundingBox.y[0];

            const boxWidth = Math.abs(boundingBox.x[0] - boundingBox.x[1]);
            const boxHeight = Math.abs(boundingBox.y[0] - boundingBox.y[1]);

            const relX = Math.random() * boxWidth;
            const relY = Math.random() * boxHeight;

            graphX = originX + relX;
            graphY = originY + relY;
        }
        else {
            let relX, relY;
            if (x || y) {
                relX = x;
                relY = y;
            }
            else {
                relX = Math.random() * window.innerWidth;
                relY = Math.random() * window.innerHeight;
            }

            let graphCoords = this.graph.screen2GraphCoords(relX, relY);
            graphX = graphCoords.x;
            graphY = graphCoords.y;
        }

        this.engine.createNode(null, graphX, graphY);
    }

    renderEmits() {
        const ctx = this.ctx
        if (!ctx) return;

        this.engine.emits.forEach((emit, i) => {
            if (emit.h <= 0) {
                return
            }

            if (!(emit.source.id in this.engine.nodeIdx)) {
                return;
            }

            const x = emit.source.x,
                y = emit.source.y;

            let length = emit.source.radius * this.EMIT_LENGTH_MULTIPLIER;
            if (emit.hit) {
                if (emit.distance) {
                    if (this.EMIT_LENGTH_DISTANCE) {
                        length = emit.distance;
                    }
                    else {
                        length *= 2;
                    }
                }
                else {
                    length *= 2;
                }
            }

            const angle = emit.angle + Math.PI;
            const beginX = x + (Math.cos(angle) * emit.source.radius);
            const beginY = y + (Math.sin(angle) * emit.source.radius);

            const endX = x + (Math.cos(angle) * length);
            const endY = y + (Math.sin(angle) * length);

            ctx.beginPath();
            ctx.moveTo(beginX, beginY);
            ctx.lineTo(endX, endY);

            let lineWidth = 1 / this.GLOBAL_SCALE * 2;

            let opacity = emit.hit ? 0.75 : 0.25;
            opacity *= (emit.h / emit.max_h) * this.EMIT_OPACITY_MULTIPLIER;

            if (this.PRETTY_EMITS) {
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, length);
                const color = emit.identity.toColor(true);

                gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`);
                gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
                ctx.strokeStyle = gradient;
                lineWidth *= 2;
            }
            else {
                //ctx.strokeStyle = `rgba(88, 88, 88, ${opacity})`;
                ctx.strokeStyle = this.buildColor(emit.identity.toColor(true), opacity);
            }

            if (emit.hit) {
                lineWidth *= 2;
            }

            ctx.lineWidth = lineWidth * this.EMIT_WIDTH_MULTIPLIER;
            ctx.stroke();
            emit.h -= 1;
        });
    }

    buildColor(c, alpha = 1.0) {
        const r = c[0];
        const g = c[1];
        const b = c[2];

        return `rgba(${r},${g},${b}, ${alpha})`;
    }

    updateDecayRate() {

        // Count dense-links (including contained?)
        let numDenseLinks = 0;
        this.engine.links.forEach(l => {
            if (l.strength > 1000) {
                numDenseLinks += 1;
            }
        });

        let z = 0
        Object.values(this.engine.nodeIdx).forEach(n => {
            if (!n.isContained && n.containedNodes?.length > 0) {
                numDenseLinks += n.containedNodes.length;
                z += n.containedNodes.length;
            }
        });

        // Calc density
        const boundingBox = this.graph.getGraphBbox();
        const area = calcArea(boundingBox);
        const density = area / numDenseLinks;

        // If density is low, bump decay down a notch

        // FIXME: Hard-code calibrated to emit rate of 0.02
        //  - big cheat

        if (density > 5000000) {
            this.DECAY_RATE = 0.0001;
        }
        else if (density > 200000) {
            this.DECAY_RATE = 0.001;
        }
        else if (density > 100000) {
            this.DECAY_RATE = 0.01;
        }
        else if (density > 20000) {
            this.DECAY_RATE = 0.1;
        }
        else {
            this.DECAY_RATE = 1;
        }

        // Increase decay rate as emit rate increases
        const adj = this.DECAY_RATE / 0.02;

        this.DECAY_RATE *= adj;
    }

    updateGraph() {
        this.graph.graphData({
            nodes: Object.values(this.engine.nodeIdx).filter(n => !n.isContained),
            links: this.engine.links,
        });
    }
}
