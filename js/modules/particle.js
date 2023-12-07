import * as THREE from 'three';

export default class Particle {
    constructor(cloth, x, y, mass) {
        this.cloth = cloth;
        this.x = x;
        this.y = y;
        this.position = new THREE.Vector3();
        this.previous = new THREE.Vector3();
        this.original = new THREE.Vector3();
        this.a = new THREE.Vector3(0, 0, 0);
        this.mass = mass;
        this.invMass = 1 / mass;
        this.tmp = new THREE.Vector3();
        this.tmp2 = new THREE.Vector3();

        const DAMPING = 0.03;
        this.DRAG = 1 - DAMPING;

        this.init();
    }

    init(){
        this.cloth(this.x, this.y, this.position);
        this.cloth(this.x, this.y, this.previous);
        this.cloth(this.x, this.y, this.original);
    }

    addForce(force){
        this.a.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
    }

    integrate(timesq){
        const newPos = this.tmp.subVectors(this.position, this.previous);
        newPos.multiplyScalar(this.DRAG).add(this.position);
        newPos.add(this.a.multiplyScalar(timesq));

        this.tmp = this.previous;
        this.previous = this.position;
        this.position = newPos;

        this.a.set(0.0, 0.0, 0.0);
    }
}