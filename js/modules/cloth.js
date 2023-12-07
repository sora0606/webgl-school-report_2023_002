import * as THREE from 'three';
import { index } from '../_lib';
import Particle from './particle';

export default class Cloth {
    constructor(w, h, clothFunction) {
        const width = w || 10;
        const height = h || 10;
        this.w = width;
        this.h = height;

        this.init(w, h, clothFunction);
    }

    init(w, h, clothFunction) {
        const particles = [];
        const constraints = [];
        let u, v;

        for (v = 0; v <= h; v++) {
            for (u = 0; u <= w; u++) {
                particles.push(new Particle(clothFunction, u / w, v / h, 0.1));
            }
        }

        for (v = 0; v < h; v++) {
            for (u = 0; u < w; u++) {
                constraints.push([
                    particles[index(u, v, w)],
                    particles[index(u, v + 1, w)],
                    25
                ]);

                constraints.push([
                    particles[index(u, v, w)],
                    particles[index(u + 1, v, w)],
                    25
                ]);
            }
        }

        for (u = w, v = 0; v < h; v++) {
            constraints.push([
                particles[index(u, v, w)],
                particles[index(u, v + 1, w)],
                25
            ]);
        }

        for (v = h, u = 0; u < w; u++) {
            constraints.push([
                particles[index(u, v, w)],
                particles[index(u + 1, v, w)],
                25
            ]);
        }

        this.particles = particles;
        this.constraints = constraints;

        this.index = index;
    }
}