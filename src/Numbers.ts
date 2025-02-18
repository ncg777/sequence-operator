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
	  
	/**
	 * Expands the bits of the number `n` by inserting extra characters after each bit.
	 * 
	 * When `filler` is '0', it inserts k zeros after each bit (dilating the bits).
	 * When `filler` is 'bit', it repeats the bit k times after the original bit (replicating the bit).
	 * 
	 * @param n - The original number.
	 * @param k - The number of extra characters to insert after each bit.
	 * @param filler - Either '0' (to insert zeros) or 'bit' (to repeat the bit). Defaults to '0'.
	 * @returns The new number after the expansion.
	 */
	static expandBits(n: number, k: number, filler: '0' | 'bit' = '0'): number {
	  const binary = n.toString(2);

	  const expandedBinary = binary
		.split('')
		.map(bit => {
		  // If filler is 'bit', repeat the bit k additional times (total k+1 copies).
		  // If filler is '0', append k zeros after the original bit.
		  return filler === 'bit'
			? bit.repeat(k + 1)
			: bit + '0'.repeat(k);
		})
		.join('');
	  
	  return parseInt(expandedBinary, 2);
	}
}