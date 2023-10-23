export function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
}

export function normalize(value, min, max) {
	return (value - min) / (max - min);
}
