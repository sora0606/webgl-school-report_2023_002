import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

import dat from "dat.gui";

import model from "../fan.glb";
import ground from "../texture/tatami.jpg";
import pattern from "../texture/circuit_pattern.jpg";
import wood from "../texture/wood.jpg";

import { clamp, normalize, plane, satisfyConstraints } from './_lib';
import Cloth from './modules/cloth';

export default class Sketch {
    constructor(opstions) {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x29 / 255, 0x29 / 255, 0x29 / 255, 1);
        this.scene.fog = new THREE.Fog(new THREE.Color(0x29 / 255, 0x29 / 255, 0x29 / 255, 1), 500, 10000);

        // Container
        this.container = opstions.dom;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.container.appendChild(this.renderer.domElement);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            1.0,
            10000.0
        );
        this.camera.position.set(400.0, 50.0, 700.0);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.maxPolarAngle = Math.PI * 0.5;
        this.controls.minDistance = 700;
        this.controls.maxDistance = 5000;

        // Three.js Loader
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://raw.githubusercontent.com/mrdoob/three.js/r147/examples/js/libs/draco/');

        this.gltf = new GLTFLoader();
        this.gltf.setDRACOLoader(this.dracoLoader);

        this.loader = new THREE.TextureLoader();

        this.time = 0;
        this.speed = 0;

        this.TIMESTEP = 18 / 1000;
        this.TIMESTEP_SQ = this.TIMESTEP * this.TIMESTEP;

        this.mass = 0.1;

        const GRAVITY = 981 * 1.4;
        this.gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(this.mass);

        this.neckActive = false;
        this.headRotationRatio = 50;
        this.headRotationSpeed = 0.005;

        this.pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        this.clothFunction = plane(25 * 10, 25 * 10);
        this.cloth = new Cloth(10, 10, this.clothFunction);

        this.isPlaying = true;

        this.addFan();
        this.addCloth();
        this.addGround();
        this.addPoles();
        this.addLight();
        this.resize();
        this.render();
        this.setupResize();
        this.settings();
    }

    settings() {
        let that = this;
        this.settings = {
            "風速": 0,
            "首振り": false,
        };

        this.gui = new dat.GUI();
        this.gui.add(this.settings, "風速", 0.0, 1.0, 0.1).onChange((value) => {
            this.speed = value;
        });
        this.gui.add(this.settings, "首振り").onChange((value) => {
            this.neckActive = value;
        });
    }

    setupResize() {
        window.addEventListener('resize', this.resize.bind(this));
    }

    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;

        this.camera.updateProjectionMatrix();
    }

    addFan() {
        this.head = new THREE.Group();

        this.materialGreen = new THREE.MeshLambertMaterial({ color: 0xAEB6A8, roughness: 0.5 });
        this.materialGold = new THREE.MeshLambertMaterial({ color: 0xC9B78E, roughness: 0.5 });

        this.gltf.load(model, (gltf) => {
            this.fan = gltf.scene;
            this.fan.scale.set(25.0, 25.0, 25.0);
            this.fan.position.y = -110.0;
            this.fan.position.z = -400.0;

            this.fan.children[0].material = new THREE.MeshLambertMaterial({
                color: 0xAEB6A8,
                transparent: true,
                opacity: 0.8,
            });
            this.fan.children[1].material = this.materialGreen;
            this.fan.children[2].material = this.materialGreen;
            this.fan.children[3].material = this.materialGold;
            this.fan.children[4].material = this.materialGreen;
            this.fan.children[5].material = this.materialGold;
            this.fan.children[6].material = this.materialGreen;
            this.fan.children[7].material = this.materialGold;
            this.fan.children[8].material = this.materialGreen;
            this.fan.children[9].material = this.materialGold;
            this.fan.children[10].material = this.materialGold;

            this.propeller = this.fan.children[0];

            this.head.add(
                this.propeller,
                this.fan.children[1],
                this.fan.children[2],
                this.fan.children[3],
                this.fan.children[4],
                this.fan.children[5],
                this.fan.children[6],
                this.fan.children[7],
                this.fan.children[10]
            );

            this.fan.add(this.head);

            this.scene.add(this.fan);
            this.fan.receiveShadow = true;
            this.fan.castShadow = true;
        });
    }

    addCloth() {
        const clothMaterial = new THREE.MeshLambertMaterial({
            map: this.loader.load(pattern),
            side: THREE.DoubleSide,
            alphaTest: 0.5
        });

        this.clothGeometry = new ParametricGeometry(
            this.clothFunction,
            this.cloth.w,
            this.cloth.h
        );

        this.clothMesh = new THREE.Mesh(this.clothGeometry, clothMaterial);
        this.clothMesh.castShadow = true;
        this.scene.add(this.clothMesh);

        this.clothMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: this.loader.load(pattern),
            alphaTest: 0.5
        });
    }

    addGround() {
        const texture = this.loader.load(ground);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(25, 25);
        texture.anisotropy = 16;

        const groundMaterial = new THREE.MeshLambertMaterial({ map: texture });

        this.ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20000.0, 20000.0),
            groundMaterial
        );
        this.ground.position.y = -250;
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    addPoles() {
        this.poles = new THREE.Group();

        const poleGeo = new THREE.BoxGeometry(5.0, 375.0, 5.0);
        const baseGeo = new THREE.BoxGeometry(10.0, 10.0, 10.0);
        const poleMat = new THREE.MeshLambertMaterial({ map: this.loader.load(wood), });

        let i = 3;

        while (i--) {
            const pole = new THREE.Mesh(i === 0 ? new THREE.BoxGeometry(255.0, 5.0, 5.0) : poleGeo, poleMat);
            pole.position.x = i !== 0 ? i === 1 ? 125 : -125 : 0;
            pole.position.y = i !== 0 ? -62 : -250 + 750 / 2;
            pole.receiveShadow = true;
            pole.castShadow = true;
            this.poles.add(pole);
        }

        i = 2;

        while (i--) {
            const base = new THREE.Mesh(baseGeo, poleMat);
            base.position.x = i === 0 ? -125 : 125;
            base.position.y = -250;
            base.receiveShadow = true;
            base.castShadow = true;
            this.poles.add(base);
        }

        this.scene.add(this.poles);
    }

    addLight() {
        const light1 = new THREE.AmbientLight(0x666666);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xdfebff, 1);
        light2.position.set(50.0, 200.0, 100.0);
        light2.position.multiplyScalar(1.3);
        light2.castShadow = true;

        light2.shadow.mapSize.width = 1024;
        light2.shadow.mapSize.height = 1024;
        const d = 300;

        light2.shadow.camera.left = -d;
        light2.shadow.camera.right = d;
        light2.shadow.camera.top = d;
        light2.shadow.camera.bottom = -d;

        light2.shadow.camera.far = 1000;
        this.scene.add(light2);
    }

    stop() {
        this.isPlaying = false;
    }

    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.render();
        }
    }

    simulate() {
        if(!this.fan || !this.cloth){
            return;
        }

        const windStrength = 100 * this.speed;
        const windForce = new THREE.Vector3(0.0, 0.0, 0.0);

        windForce.set(
            -(this.fan.position.z - (100 * this.speed)) * Math.sin(this.head.rotation.y),
            30,
            (100 * this.speed) * Math.cos(this.head.rotation.y)
        );

        windForce.normalize();
        windForce.multiplyScalar(windStrength);

        let i, j, il, particles, particle, constraints, constraint;

        if (this.speed) {
            const normal = new THREE.Vector3();
            const tmpForce = new THREE.Vector3();
            const indices = this.clothGeometry.index;
            const normals = this.clothGeometry.attributes.normal;

            particles = this.cloth.particles;

            for (i = 0, il = indices.count; i < il; i += 3) {
                for (j = 0; j < 3; j++) {
                    const index = indices.getX(i + j);
                    normal.fromBufferAttribute(normals, index);
                    tmpForce.copy(normal).normalize().multiplyScalar(normal.dot(windForce));
                    particles[index].addForce(tmpForce);
                }
            }
        }

        for (particles = this.cloth.particles, i = 0, il = particles.length; i < il; i++) {
            particle = particles[i];
            particle.addForce(this.gravity);

            particle.integrate(this.TIMESTEP_SQ);
        }

        constraints = this.cloth.constraints;
        il = constraints.length;

        for(i = 0; i < il; i++){
            constraint = constraints[i];
            satisfyConstraints(constraint[0], constraint[1], constraint[2]);
        }

        for(i = 0, il = this.pins.length; i < il; i++){
            const xy = this.pins[i];
            const p = particles[xy];
            p.position.copy(p.original);
            p.previous.copy(p.original);
        }
    }

    render() {
        if (!this.isPlaying) return;

        this.time += 0.001;

        if (this.propeller) {
            this.propeller.rotation.y += this.speed;
        }

        if (this.head && this.neckActive) {
            this.head.rotation.y += this.headRotationSpeed;

            const normalizeY = normalize(clamp(this.head.rotation.y, -(this.headRotationRatio * 0.5) * Math.PI / 180, (this.headRotationRatio * 0.5) * Math.PI / 180), -(this.headRotationRatio * 0.5) * Math.PI / 180, (this.headRotationRatio * 0.5) * Math.PI / 180);

            if (normalizeY === 1 || normalizeY === 0) {
                this.headRotationSpeed = -this.headRotationSpeed;
            }
        }

        this.simulate();

        const p = this.cloth.particles;

        for(let i = 0, il = p.length; i < il; i++){
            const v = p[i].position;
            this.clothGeometry.attributes.position.setXYZ(i, v.x, v.y, v.z);
        }

        this.clothGeometry.attributes.position.needsUpdate = true;
        this.clothGeometry.computeVertexNormals();

        requestAnimationFrame(this.render.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}

new Sketch({
    dom: document.getElementById("container")
});