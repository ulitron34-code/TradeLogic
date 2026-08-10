import { describe, expect, it } from 'vitest';
import { cosineSimilarity, topKBySimilarity } from './similarity.js';

describe('jurisprudence similarity', () => {
  it('ranks the closest precedent and handles zero vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    expect(topKBySimilarity([1, 0], [{ item: 'near', embedding: [1, 0] }, { item: 'far', embedding: [0, 1] }], 1)).toEqual([{ item: 'near', score: 1 }]);
  });
});
