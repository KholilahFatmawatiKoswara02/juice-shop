import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reviewsCollection } from '../../data/mongodb'

void describe('in-memory document collections', () => {
  void it('rejects executable selectors', async () => {
    await assert.rejects(
      reviewsCollection.find({ $where: 'globalThis.injected = true' }),
      { name: 'TypeError', message: 'Only exact-value selectors are supported' }
    )
    assert.equal((globalThis as { injected?: boolean }).injected, undefined)
  })
})
