import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

import {
    calcArea,
    createCanvasThumbnail,
} from './utils';

import { SignalEngine } from './engine.js';
import { UIConfig } from './uiconfig';

export class Sphere3D {
    RUN_ID = null;
    lastAnimationFrame = null;

    BASE_NODE_RADIUS = 60;

    INITIALIZED = false;
    RUNNING = false;
    FIRST_RUN = true;

    GLOBAL_SCALE = 1;

    LINKING_ENABLED = true;
    LINKS_WEAK_VISIBLE = false;
    LINKS_STRONG_VISIBLE = true;
    LINKS_PERMA_VISIBLE = true;

    GREEDY_REMOVAL = false;

    EMITS_VISIBLE = false;
    PRETTY_EMITS = false;

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

    SPHERE_RADIUS = 1000

    constructor(el) {
        this.el = el
        this.BASE_PARTICLE_RADIUS = this.BASE_NODE_RADIUS * 0.5;

        this.onResize = this.onResize.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
    }

    init(config = {}) {
        const el = this.el;

        this.reset();
        const moduleId = 'Sphere3D';

        const sectionConfig = {
            opacity: {
                label: 'Opacity',
                defaultValue: 20,
                range: {
                    min: 0,
                    max: 100
                },
                step: 10
            },
            /*enabled: {
                defaultValue: true
            },
            name: {
                defaultValue: 'Default Name'
            }*/
        };

        UIConfig.registerSection(moduleId, 'Sphere', sectionConfig);

        const handleControlUpdate = (update) => {
            if (update.id == 'opacity') {
                this.setSphereTransparency(update.value / 100);
            }
            else {
                debugger
            }
        };

        UIConfig.registerCallback(moduleId, handleControlUpdate);

        window.addEventListener('resize', this.onResize);

        this.RUN_ID = parseInt((Math.random() * 900000) + 100000);
        console.log('init signals', this.RUN_ID);

        this.setupScene();
        this.setupEvents();

        this.engine = new SignalEngine();

        this.engine.calcNodeDistance = this.calcNodeDistance.bind(this);
        this.engine.rayHit = this.rayHit.bind(this);
        this.engine.cleanupSignal = this.cleanupSignal.bind(this);
        this.engine.cleanupNode = this.cleanupNode.bind(this);

        this.engine.DECAY_RATE = 0;
        this.engine.EMITS_ENABLED = false;

        this.EMITS_VISIBLE = false;
        this.INITIALIZED = true;

        this.animateSphere();

        if (config.start) {
            this.RUNNING = true;
            this.animate();
        }

        this.FIRST_RUN = false;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    calcNodeDistance(nodeA, nodeB) {
        return greatCircleDistance(nodeA, nodeB, this.SPHERE_RADIUS);
    }

    cleanupNode(node) {
        const nodeGroup = this.nodeGroups[node.id];
        if (nodeGroup) {
            removeObject3D(nodeGroup.text);
            removeObject3D(nodeGroup.circle);
            removeObject3D(nodeGroup.group);
        }
    }

    cleanupSignal(signal) {
        if (signal.lineMesh) {
            removeObject3D(signal.lineMesh);
            signal.lineMesh = null;
        }
    }

    rayHit(signal, targetNode) {

        const sourceXYZ = sphericalToCartesian(signal.source.theta, signal.source.phi, this.SPHERE_RADIUS);
        const targetXYZ = sphericalToCartesian(targetNode.theta, targetNode.phi, this.SPHERE_RADIUS);

        const antipodeXYZ = {
            x: -sourceXYZ.x,
            y: -sourceXYZ.y,
            z: -sourceXYZ.z
        };

        function XYZToFlat(xyz) {
            return [xyz.x, xyz.y, xyz.z];
        }

        const points = tessellateArc(
            XYZToFlat(sourceXYZ),
            XYZToFlat(antipodeXYZ),
            [0,0,0],
            this.SPHERE_RADIUS,
            20,
            signal.angle
        ).slice(0, 5);

        const hit = intersectsSmallSphere(points, XYZToFlat(targetXYZ), this.BASE_NODE_RADIUS);
        return hit;
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
        }
    }

    control(action, v, w) {
        if (action == 'start') {
            this.startSim(v);
        }
        else if (action == 'config') {
            Object.entries(v).forEach(([configID, val]) => {
                this[configID] = val;
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
        else if (action == 'sphereTransparency') {
            this.setSphereTransparency(v / 100);
        }
        else if (action == 'emitRate') {
            v = Math.min(20, Math.max(1, v));
            this.EMIT_RATE = v / 100;
            this.engine.EMIT_RATE = this.EMIT_RATE;
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
                this.stopSim()
            }
            else if (action == 'reset') {
                this.reset();
            }
            else if (action == 'maxGroupLevels') {
                this.engine.setMaxGroupLevels(v)
            }
            else if (action == 'addNodes') {
                Array(v).fill().forEach(() => {
                    this.addNode({}, false);
                });

                this.updateGraph()
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

    setSphereColor() {

    }

    setSphereTransparency(transparency = 0) {
        if (!this.sphere) {
            return
        }

        if (transparency < 1) {
            this.sphere.material.transparent = true;
            this.sphere.material.opacity = transparency;
        }
        else {
            this.sphere.material.transparent = false;
            this.sphere.material.opacity = 1.0;
        }
    }

    setupScene() {
        const radius = this.SPHERE_RADIUS;

        const scene = new THREE.Scene();
        scene.background = null; // new THREE.Color( 0x000000 );

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, radius * 5);
        const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        this.el.appendChild(renderer.domElement);
        
        // Sphere
        const geometry = new THREE.SphereGeometry(radius, 64, 64);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x444444,
            side: THREE.DoubleSide,
        });
        material.format = THREE.RGBAFormat;

        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        if (false) {
            // Add poles
            const poleGeometry = new THREE.CircleGeometry(this.BASE_NODE_RADIUS * 2, 32);
            const poleMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                side: THREE.DoubleSide
            });

            // North pole (phi = 0)
            const northPole = new THREE.Mesh(poleGeometry, poleMaterial);
            northPole.position.set(0, 0, radius);
            northPole.lookAt(0, 0, 0);
            sphere.add(northPole);

            // South pole (phi = π)
            const southPole = new THREE.Mesh(poleGeometry, poleMaterial);
            southPole.position.set(0, 0, -radius);
            southPole.lookAt(0, 0, 0);
            sphere.add(southPole);
        }

        // Camera position
        camera.position.z = radius * 1.75;

        this.renderer = renderer;
        this.camera = camera;
        this.scene = scene;
        this.sphere = sphere;

        this.setSphereTransparency(0.2);
        //this.setSphereColor();

        this.renderer.render(this.scene, this.camera);
    }

    onMouseDown(event) {
        this.isDragging = true;
        this.previousMousePosition = null;

        if (event.button == 2) {
            //simulation.restart()
        }
    }

    onMouseMove(event) {
        if (this.isDragging) {

            if (this.previousMousePosition) {
                const deltaMove = {
                    x: event.clientX - this.previousMousePosition.x,
                    y: event.clientY - this.previousMousePosition.y
                };
                this.sphere.rotation.y += deltaMove.x * 0.005;
                this.sphere.rotation.x += deltaMove.y * 0.005;
            }

            this.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onWheel(event) {
        this.camera.position.z += event.deltaY * 0.5;
        this.camera.position.z = Math.max(this.SPHERE_RADIUS * 1.25, Math.min(this.SPHERE_RADIUS * 3, this.camera.position.z));
    }

    onContextMenu(e) {
        e.preventDefault();
    }

    setupEvents() {
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };

        this.el.addEventListener('mousedown', this.onMouseDown);
        this.el.addEventListener('mousemove', this.onMouseMove);
        this.el.addEventListener('mouseup', this.onMouseUp);
        this.el.addEventListener('wheel', this.onWheel);
        this.el.addEventListener('contextmenu', this.onContextMenu);
    }

    teardownEvents() {
        window.removeEventListener('resize', this.onResize);
        this.el.removeEventListener('mousedown', this.onMouseDown);
        this.el.removeEventListener('mousemove', this.onMouseMove);
        this.el.removeEventListener('mouseup', this.onMouseUp);
        this.el.removeEventListener('wheel', this.onWheel);
        this.el.removeEventListener('contextmenu', this.onContextMenu);
    }

    teardownScene() {
        if (!this.INITIALIZED) {
            return;
        }

        // Cleanup emits
        this.engine?.emits.forEach((emit, i) => {
            this.cleanupSignal(emit);
            emit.lineMesh = null;
        });

        this.renderer.render(this.scene, this.camera);

        Object.values(this.engine.nodeIdx).forEach(node => {
            this.cleanupNode(node);
        });

        // FIXME: also need to remove downstream children?
        this.sphere.children.forEach((o) => {
            removeObject3D(o);
        });
        this.renderer.render(this.scene, this.camera);

        this.el.removeChild(this.renderer.domElement);

        this.scene.children.forEach(removeObject3D);
        this.scene.clear();

        // TODO: detach event listeners

        this.renderer.renderLists.dispose();
        this.renderer.forceContextLoss();
        this.renderer.context = null;
        this.renderer.domElement = null;
        this.renderer.dispose();

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.sphere = null;
    }

    addNode({x, y}) {
        let relX, relY;
        if (x || y) {
            relX = x;
            relY = y;
        }
        else {
            relX = Math.random() * window.innerWidth;
            relY = Math.random() * window.innerHeight;
        }

        let node = this.engine.createNode(null, relX, relY);
        node.theta = Math.random() * Math.PI * 2;
        node.phi = Math.acos(2 * Math.random() - 1);

        const group = new THREE.Group();
        
        // Circle
        const pos = sphericalToCartesian(node.theta, node.phi, this.SPHERE_RADIUS);
        const circleGeometry = new THREE.CircleGeometry(this.BASE_NODE_RADIUS, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: node.color,
            side: THREE.DoubleSide
        });
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        circle.position.set(pos.x, pos.y, pos.z);
        circle.position.multiplyScalar(1.002);
        circle.lookAt(0, 0, 0);
        
        // Text
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = 'rgba(0,0,0,1)'; // White text for contrast
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(node.id.toString(), 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            color: 'black',
            transparent: true,
            side: THREE.DoubleSide
        });
        const textGeometry = new THREE.PlaneGeometry(this.BASE_NODE_RADIUS / 2, this.BASE_NODE_RADIUS / 2);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(pos.x, pos.y, pos.z);
        textMesh.position.multiplyScalar(1.0025); // Slight offset to prevent z-fighting
        textMesh.lookAt(0, 0, 0);

        /*// Reverse the lookAt direction to face outward
        const center = new THREE.Vector3(0, 0, 0);
        textMesh.lookAt(textMesh.position.clone().sub(center));*/
        
        group.add(circle);
        group.add(textMesh);
        this.sphere.add(group);

        this.nodeGroups[node.id] = {
            group,
            circle,
            text: textMesh
        }

        return node;
    }

    renderSphere() {
        if (1) {
            Object.values(this.nodeGroups).forEach(group => {
                const worldPos = new THREE.Vector3();
                group.circle.getWorldPosition(worldPos);
                group.circle.lookAt(worldPos.clone().multiplyScalar(2));

                group.text.getWorldPosition(worldPos);
                group.text.lookAt(worldPos.clone().multiplyScalar(2));
            });
        }

        this.renderer.render(this.scene, this.camera);
    }

    animateSphere() {
        if (this.INITIALIZED) {
            requestAnimationFrame(() => this.animateSphere());
            if (!this.PAUSED) {
                this.renderSphere();
            }
        }
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

            this.engine.tick();

            if (this.EMITS_VISIBLE) {
                this.renderEmits();
            }
            this.updateGraph();
        }
        catch (e) {
            // Useful if hot-reloading when animate() hasn't finished yet
            console.log('caught error', e);
        }

        if (this.RUNNING) {
            this.lastAnimationFrame = requestAnimationFrame(() => this.animate());
        }
        else {
            console.log('Stop anim', this.RUN_ID);
        }
    }

    reset() {
        this.RUNNING = false;
        this.FIRST_RUN = true;

        UIConfig.unregisterSection('Sphere');

        cancelAnimationFrame(this.lastAnimationFrame);

        console.log(`reset signals, RunID done: ${this.RUN_ID}`);
        this.RUN_ID = null;

        this.teardownScene();
        this.teardownEvents();
        this.nodeGroups = {};

        if (this.engine) {
            this.engine.reset();
        }
        this.INITIALIZED = false;
    }

    renderEmits() {
        this.emitMeshes = this.emitMeshes || [];
        //console.log('emits', this.engine.emits.length)
        this.engine.emits.forEach((emit, i) => {
            if (emit.h <= 0) {
                this.cleanupSignal(emit);
                emit.lineMesh = null;
                return
            }

            if (!(emit.source.id in this.engine.nodeIdx)) {
                return;
            }

            let opacity = emit.hit ? 0.75 : 0.25;
            opacity *= (emit.h / emit.max_h) * this.EMIT_OPACITY_MULTIPLIER;
            
            //const color = this.buildColor(emit.identity.toColor(true), opacity);
            const color = emit.identity.toColor();

            let sizeMultiplier = 1;
            if (emit.hit) {
                sizeMultiplier = 5;
            }

            if (!emit.lineMesh) {
                const arcLength = emit.hit ? 2.0 : 0.15;
                this.createLine(emit, color, sizeMultiplier, arcLength);

                const nodeColor = emit.identity.toColor(true);
                const nodeGroup = this.nodeGroups[emit.source.id]
                nodeGroup.circle.material.color.setRGB(
                    nodeColor[0] / 256,
                    nodeColor[1] / 256,
                    nodeColor[2] / 256
                );
            }
            else {
                // Update the line

                /*emit.lineMesh.geometry.dispose();

                const originPoint = sphericalToCartesian(emit.source.theta, emit.source.phi, this.SPHERE_RADIUS)
                emit.lineMesh.geometry = createCurvePoints(
                    originPoint,
                    emit.angle,
                    this.SPHERE_RADIUS,
                    0.25
                );

                emit.lineMesh.material.linewidth = 5 * sizeMultiplier;

                createGreatCirclePath(
                    emit.source, 
                    getAntipode(this.SPHERE_RADIUS, normTheta(emit.source.theta), normPhi(emit.source.phi)),
                    this.SPHERE_RADIUS,
                    sizeMultiplier,
                );*/
            }

            emit.h -= 1;
        });
    }

    createLine(emit, color, sizeMultiplier, arcLength) {
        /*const originPoint = sphericalToCartesian(
            emit.source.theta,
            emit.source.phi,
            this.SPHERE_RADIUS,
        )
        const curvePoints = createCurvePoints(
            originPoint,
            emit.angle,
            this.SPHERE_RADIUS, // * 1.0015,
            arcLength,
        );

        const mesh = createArc(curvePoints, sizeMultiplier, color);*/

        const sourceXYZ = sphericalToCartesian(emit.source.theta, emit.source.phi, this.SPHERE_RADIUS);
        const antipodeXYZ = {
            x: -sourceXYZ.x,
            y: -sourceXYZ.y,
            z: -sourceXYZ.z
        };

        function XYZToFlat(xyz) {
            return [xyz.x, xyz.y, xyz.z];
        }

        const points = tessellateArc(
            XYZToFlat(sourceXYZ),
            XYZToFlat(antipodeXYZ),
            [0,0,0],
            this.SPHERE_RADIUS,
            20,
            emit.angle
        ).slice(0, 5);

        const curvePoints = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const mesh = createArc(curvePoints, 1 * sizeMultiplier, emit.source.identity.toColor());
        this.sphere.add(mesh);
        emit.lineMesh = mesh;
    }

    buildColor(c, alpha = 1.0) {
        const r = c[0];
        const g = c[1];
        const b = c[2];

        return `rgba(${r},${g},${b}, ${alpha})`;
    }

    updateGraph() {
        const radius = this.SPHERE_RADIUS;

        this.engine.links.forEach(link => {
            let moveNode = link.source,
                targetNode = link.target;

            let useShortPath = true; //Math.random() < 0.5;
            const result = getPointOnSphericalArc(
                radius,
                moveNode.theta,
                moveNode.phi,
                targetNode.theta,
                targetNode.phi,
                0.00001 * link.strength,
                useShortPath,
            );

            moveNode.theta = result.theta;
            moveNode.phi = result.phi;

            let renderNodes = [moveNode];
            renderNodes.forEach((node, i) => {
                const nodeID = node.id;
                const pos = sphericalToCartesian(node.theta, node.phi, radius);

                node.x = pos.x;
                node.y = pos.y;
                node.z = pos.z;

                const nodeGroup = this.nodeGroups[nodeID];
                nodeGroup.circle.position.set(pos.x, pos.y, pos.z);
                nodeGroup.circle.position.multiplyScalar(1.002);

                nodeGroup.text.position.set(pos.x, pos.y, pos.z);
                nodeGroup.text.position.multiplyScalar(1.0025);
            });

            /*// Update link positions
            Object.entries(linkMeshes).forEach(([linkID, mesh]) => {
                mesh.geometry.dispose();

                const link = links.find(l => l.id == linkID);
                mesh.geometry = createGreatCirclePath(nodes[link.source], nodes[link.target]);
            });*/
        });

        this.engine.links = [];
    }
}


function sphericalToCartesian(theta, phi, rr) {
    const r = rr + 0
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    return { x, y, z };
}


const normTheta = (t) => {
    t = t % (Math.PI * 2);
    if (t < 0) {
        t += Math.PI * 2;
    }
    return t;
}


const normPhi = (p) => {
    return Math.max(0.01, Math.min(Math.PI - 0.01, p));
}


function greatCircleDistance(node1, node2, radius) {

    return radius * Math.acos(
        Math.sin(normPhi(node1.phi)) * Math.sin(normPhi(node2.phi)) * 
        Math.cos(normTheta(node1.theta) - normTheta(node2.theta)) + 
        Math.cos(normPhi(node1.phi)) * Math.cos(normPhi(node2.phi))
    );
}


function createGreatCirclePath(source, target, radius, z, sizeMultiplier = 1) {
    const start = sphericalToCartesian(source.theta, source.phi, radius);
    const end = sphericalToCartesian(target.theta, target.phi, radius);
    const segments = 16;
    const points = [];

    // Interpolate along great circle
    const v1 = new THREE.Vector3(start.x, start.y, start.z).normalize();
    const v2 = new THREE.Vector3(end.x, end.y, end.z).normalize();
    const angle = Math.acos(v1.dot(v2));
    const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const rotation = new THREE.Quaternion()
            .setFromAxisAngle(axis, angle * t);
        const point = v1.clone().applyQuaternion(rotation);
        points.push(point.multiplyScalar(radius));
    }

    const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        segments,
        1 * sizeMultiplier,  // tube radius
        8,     // radial segments
        false  // not closed
    );
    return geometry;
}


function getPointOnSphericalArc(radius, theta1, phi1, theta2, phi2, t, useShortPath = true) {
    // Convert spherical coordinates to Cartesian coordinates
    function sphericalToCartesian(r, theta, phi) {
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        return { x, y, z };
    }

    // Convert Cartesian coordinates back to spherical coordinates
    function cartesianToSpherical(x, y, z) {
        const r = Math.sqrt(x * x + y * y + z * z);
        const theta = Math.atan2(y, x);
        const phi = Math.acos(z / r);
        return { theta: theta >= 0 ? theta : theta + 2 * Math.PI, phi };
    }

    // Get Cartesian coordinates of both points
    const point1 = sphericalToCartesian(radius, theta1, phi1);
    const point2 = sphericalToCartesian(radius, theta2, phi2);

    // Calculate the angular separation (central angle) between points
    const dotProduct = point1.x * point2.x + point1.y * point2.y + point1.z * point2.z;
    const mag1 = Math.sqrt(point1.x ** 2 + point1.y ** 2 + point1.z ** 2);
    const mag2 = Math.sqrt(point2.x ** 2 + point2.y ** 2 + point2.z ** 2);
    let centralAngle = Math.acos(dotProduct / (mag1 * mag2));

    // Handle case where points are identical or antipodal
    if (centralAngle === 0) {
        return { theta: theta1, phi: phi1 };
    }
    if (Math.abs(centralAngle - Math.PI) < 1e-10) {
        throw new Error("Points are antipodal - infinite possible arcs exist");
    }

    // Adjust central angle for long path if requested
    if (!useShortPath) {
        centralAngle = 2 * Math.PI - centralAngle;
    }

    // Calculate the intermediate point using spherical linear interpolation (slerp)
    const sinTotal = Math.sin(centralAngle);
    const a = Math.sin((1 - t) * centralAngle) / sinTotal;
    const b = Math.sin(t * centralAngle) / sinTotal;

    const x = a * point1.x + b * point2.x;
    const y = a * point1.y + b * point2.y;
    const z = a * point1.z + b * point2.z;

    // Convert back to spherical coordinates
    const result = cartesianToSpherical(x, y, z);
    
    return {
        theta: result.theta,
        phi: result.phi,
        radius: radius
    };
}


function getAntipode(radius, theta, phi) {
    // Validate inputs
    if (radius < 0 || theta < 0 || theta > Math.PI * 2 || phi < 0 || phi > Math.PI) {
        throw new Error("Invalid spherical coordinates: radius >= 0, 0 <= theta <= π, 0 <= phi <= 2π");
    }
    
    // Calculate antipodal coordinates
    const antipodeTheta = Math.PI - theta; // Flip colatitude (θ → π - θ)
    const antipodePhi = (phi + Math.PI) % (2 * Math.PI); // Shift longitude by π (180°), wrap around
    
    return {
        radius: radius,
        theta: antipodeTheta,
        phi: antipodePhi
    };
}


function removeObject3D(object3D) {
    if (!(object3D instanceof THREE.Object3D)) return false;

    if (object3D.geometry) {
        object3D.geometry.dispose();
    }

    if (object3D.material) {
        if (object3D.material instanceof Array) {
            object3D.material.forEach(material => {
                material?.map?.dispose();
                material.dispose();
            });
        }
        else {
            object3D.material?.map?.dispose();
            object3D.material.dispose();
        }
    }

    object3D.removeFromParent();
    return true;
}


function createCurvePoints(origin, angle, radius, arcFrac = 1.0) {
    const arcLength = Math.PI * radius * arcFrac; // Half circumference

    const points = [];
    const segments = 16; 

    const quaternion = getRotationToOrigin(origin);

    for (let j = 0; j <= segments; j++) {
        const t = j / segments * arcLength / radius;
        const x = radius * Math.cos(t);
        const y = radius * Math.sin(t) * Math.cos(angle);
        const z = radius * Math.sin(t) * Math.sin(angle);
        
        const point = new THREE.Vector3(x, y, z);
        point.applyQuaternion(quaternion);
        points.push(point);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(parseInt(Math.ceil(30 * arcFrac)));

    return curvePoints
}

function createArc(curvePoints, lineWidth, color) {
    const lineGeometry = new LineGeometry().setFromPoints(curvePoints);
    const lineMaterial = new LineMaterial({ 
        color,
        linewidth: lineWidth,
        opacity: 1,
        transparent: false
    });

    return new Line2(lineGeometry, lineMaterial);
}

function getRotationToOrigin(origin) {
    origin = new THREE.Vector3(origin.x, origin.y, origin.z);

    const defaultVector = new THREE.Vector3(1, 0, 0);
    const targetVector = origin.clone().normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(defaultVector, targetVector);
    return quaternion;
}


function tessellateArc(p1, p2, center, radius, numPoints, angle) {
    // Small threshold for floating-point comparisons
    const epsilon = 1e-6;

    // Vector helper functions
    function subtract(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    function add(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    function dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    function norm(a) {
        return Math.sqrt(dot(a, a));
    }

    function scale(a, s) {
        return [a[0] * s, a[1] * s, a[2] * s];
    }

    // Translate points relative to the center
    const q1 = subtract(p1, center);
    const q2 = subtract(p2, center);

    // Compute normalized dot product to check if points are antipodes
    const d = dot(q1, q2) / (radius * radius);
    const points = [];

    if (Math.abs(d + 1) < epsilon) {
        // Antipode case: q2 ≈ -q1
        // Find a vector u perpendicular to q1
        let u;
        if (Math.abs(q1[0]) > epsilon || Math.abs(q1[1]) > epsilon) {
            u = [-q1[1], q1[0], 0]; // Perpendicular in xy-plane if possible
        }
        else {
            u = [0, -q1[2], q1[1]]; // Use yz-plane if q1 is along z-axis
        }

        // Normalize u to radius length
        const uNorm = norm(u);
        const u1 = scale(u, radius / uNorm);

        // Compute u2 perpendicular to both q1 and u1
        const u2 = scale(cross(q1, u1), 1 / radius); // ||cross(q1, u1)|| = radius^2

        // Define v as a linear combination of u1 and u2 based on angle
        const v = add(scale(u1, Math.cos(angle)), scale(u2, Math.sin(angle)));

        // Parameterize arc from q1 to -q1 via v
        for (let i = 0; i < numPoints; i++) {
            const t = numPoints === 1 ? 0 : i / (numPoints - 1);
            const qt = add(
                scale(q1, Math.cos(t * Math.PI)),
                scale(v, Math.sin(t * Math.PI))
            );
            const pt = add(qt, center);
            points.push(pt);
        }
    }
    else {
        // Non-antipode case: use slerp
        const theta = Math.acos(Math.max(-1, Math.min(1, d))); // Clamp d to [-1, 1]
        for (let i = 0; i < numPoints; i++) {
            const t = numPoints === 1 ? 0 : i / (numPoints - 1);
            let qt;
            if (theta > epsilon) {
                const sinTheta = Math.sin(theta);
                qt = add(
                    scale(q1, Math.sin((1 - t) * theta) / sinTheta),
                    scale(q2, Math.sin(t * theta) / sinTheta)
                );
            }
            else {
                // When points are close (theta ≈ 0), use linear interpolation and normalize
                const qtLin = add(scale(q1, 1 - t), scale(q2, t));
                const qtNorm = norm(qtLin);
                qt = scale(qtLin, radius / qtNorm);
            }
            const pt = add(qt, center);
            points.push(pt);
        }
    }

    return points;
}


function intersectsSmallSphere(points, smallCenter, smallRadius) {
    for (const point of points) {
        const distance = euclideanDistance(point, smallCenter);
        if (distance <= smallRadius) {
            return true;
        }
    }
    return false;
}


function euclideanDistance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
