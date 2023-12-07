import * as THREE from 'three';

export function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
}

export function normalize(value, min, max) {
	return (value - min) / (max - min);
}

export function plane(width, height){
    return function (u, v, target){
        const x = (u - 0.5) * width;
        const y = (v + 0.5) * height;
        const z = 0;

        target.set(x, y, z);
    };
}

export function index(u, v, w) {
    return u + v * (w + 1);
}

export function satisfyConstraints(p1, p2, distance) {
    const diff = new THREE.Vector3();
    diff.subVectors(p2.position, p1.position);
    var currentDist = diff.length();
    if (currentDist === 0) return; // prevents division by 0
    var correction = diff.multiplyScalar(1 - distance / currentDist);
    var correctionHalf = correction.multiplyScalar(0.5);
    p1.position.add(correctionHalf);
    p2.position.sub(correctionHalf);
}