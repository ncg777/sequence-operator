// src/Numbers.ts
export class Numbers {
    static gcd(a: number, b: number): number {
        if (!b) return a;
        return Numbers.gcd(b, a % b);
    }

    static lcm(a: number, b: number): number {
        return (a * b) / Numbers.gcd(a, b);
    }
    static binomial(n: number, k: number): number {
        if (n < 0) {
            throw new Error("n must be non-negative.");
        }
        if (k < 0) {
            throw new Error("k must be non-negative.");
        }
        if (k > n) {
            throw new Error("k cannot be greater than n.");
        }
    
        if (k > n - k) {
            k = n - k;
        }
    
        let result = 1;
    
        for (let i = 0; i < k; i++) {
            // Calculate the next value
            const next = (result * (n - i)) / (i + 1);
    
            // Check for overflow
            if (next > Number.MAX_SAFE_INTEGER) {
                throw new Error("Overflow detected.");
            }
    
            result = next;
        }
    
        return result;
      }
}