import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";

import vertex from "./shader/vertex.glsl"
import fragment from "./shader/fragment.glsl"

import waterNormals from "../waternormals.jpg"

import dat from "dat.gui";
import model from "../fan.glb";
import { clamp, normalize } from './_lib';

export default class Sketch {
    constructor(opstions) {
        this.scene = new THREE.Scene();

        this.container = opstions.dom;
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0xFFFFFF, 1);
        this.renderer.shadowMap.enabled = true;

        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.001,
            1000.0
        );
        this.camera.position.set(12.0, 10.0, 27.0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.time = 0;
        this.speed = 0.1;

        this.neckActive = false;
        this.headRotationRatio = 100;
        this.headRotationSpeed = 0.01;

        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://raw.githubusercontent.com/mrdoob/three.js/r147/examples/js/libs/draco/');

        this.gltf = new GLTFLoader();
        this.gltf.setDRACOLoader(this.dracoLoader);

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.isPlaying = true;

        this.addBasis();
        this.addObjects();
        // this.addLight();
        this.addSky();
        this.addSun();
        this.addWater();
        this.resize();
        this.render();
        this.setupResize();
        this.settings();
    }

    settings() {
        let that = this;
        this.settings = {
            progress: 0,
            speed: 0.1,
            sunPos: 0.49,
            "首振り": false,
        };

        this.gui = new dat.GUI();
        this.gui.add(this.settings, "progress", 0.0, 1.0, 0.01);
        this.gui.add(this.settings, "speed", 0.1, 1.0, 0.1).onChange((value) => {
            this.speed = value;
        });
        this.gui.add(this.settings, "sunPos", -1.0, 1.0, 0.01).onChange((value) => {
            const theta = Math.PI * (value - 0.5);
            const phi = 2 * Math.PI * (0.205 - 0.5);
            this.sun.y = Math.sin(phi) * Math.sin(theta);
            this.sun.z = Math.sin(phi) * Math.cos(theta);
            this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
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

    addSky() {
        this.sky = new Sky();
        this.sky.scale.set(10000, 10000, 10000);
        this.scene.add(this.sky);
    }

    addSun() {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.sun = new THREE.Vector3();

        const theta = Math.PI * (0.49 - 0.5);
        const phi = 2 * Math.PI * (0.205 - 0.5);
        this.sun.x = Math.cos(phi);
        this.sun.y = Math.sin(phi) * Math.sin(theta);
        this.sun.z = Math.sin(phi) * Math.cos(theta);

        this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
        this.scene.environment = pmremGenerator.fromScene(this.sky).texture;
    }

    addWater() {
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load(waterNormals, (texture) => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                alpha: 1.0,
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );

        this.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.water);
    }

    addBasis() {
        const geometry = new THREE.CylinderGeometry(10, 10, 2, 100);
        const material = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1 });

        this.basis = new THREE.Mesh(geometry, material);
        this.basis.position.y = 0;
        this.scene.add(this.basis);
    }

    addObjects() {
        let that = this;
        this.head = new THREE.Group();

        this.materialGreen = new THREE.MeshStandardMaterial({ color: 0xAEB6A8, roughness: 0.5 });
        this.materialGold = new THREE.MeshStandardMaterial({ color: 0xC9B78E, roughness: 0.5 });

        this.gltf.load(model, (gltf) => {
            this.fan = gltf.scene;
            this.fan.position.y = 10;
            this.scene.add(this.fan);

            this.fan.children[0].material = new THREE.MeshToonMaterial({
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
                this.fan.children[0],
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
        });
    }

    addLight() {
        const light1 = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(light1);

        // const light3 = new THREE.SpotLight(0xffffff, 1, 100);
        // light3.position.set(0.6, 10.0, 0.0);
        // light3.castShadow = true;
        // this.scene.add(light3);
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

    render() {
        if (!this.isPlaying) return;

        this.water.material.uniforms['time'].value += this.speed * 5.0 / 60.0;
        this.time += 0.001;

        if (this.propeller) {
            this.propeller.rotation.y += this.speed;
        }

        if (this.fan) {
            this.fan.rotation.x -= this.speed * 0.1;
            this.fan.rotation.y += this.speed * 0.1;
            this.fan.rotation.z -= this.speed * 0.1;
        }

        if (this.head && this.neckActive) {
            this.head.rotation.y += this.headRotationSpeed;

            const normalizeY = normalize(clamp(this.head.rotation.y, -(this.headRotationRatio * 0.5) * Math.PI / 180, (this.headRotationRatio * 0.5) * Math.PI / 180), -(this.headRotationRatio * 0.5) * Math.PI / 180, (this.headRotationRatio * 0.5) * Math.PI / 180);

            if (normalizeY === 1 || normalizeY === 0) {
                this.headRotationSpeed = -this.headRotationSpeed;
            }
        }

        requestAnimationFrame(this.render.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}

new Sketch({
    dom: document.getElementById("container")
});