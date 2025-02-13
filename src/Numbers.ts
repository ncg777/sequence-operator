// src/Numbers.ts
export class Numbers {
    static gcd(a: number, b: number): number {
        if (!b) return a;
        return Numbers.gcd(b, a % b);
    }

    static lcm(a: number, b: number): number {
        return (a * b) / Numbers.gcd(a, b);
    }
}