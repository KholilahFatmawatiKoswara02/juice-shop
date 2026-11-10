/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { randomUUID } from 'node:crypto'
import type { ProductModel } from '../models/product'

interface Document {
  _id: string
  [key: string]: unknown
}

interface Update {
  $set?: Record<string, unknown>
  $inc?: Record<string, number>
}

class InMemoryCollection<T extends Document> {
  private readonly documents: T[] = []

  async insert (document: Omit<T, '_id'>): Promise<T> {
    const inserted = { ...document, _id: randomUUID() } as T
    this.documents.push(inserted)
    return inserted
  }

  async find (selector: Record<string, unknown> = {}): Promise<T[]> {
    const criteria = Object.entries(selector)
    for (const [key, value] of criteria) {
      if (key.startsWith('$') || (value !== null && typeof value === 'object')) {
        throw new TypeError('Only exact-value selectors are supported')
      }
    }

    return this.documents.filter(document =>
      criteria.every(([key, value]) => document[key] === value)
    )
  }

  async findOne (selector: Record<string, unknown>): Promise<T | undefined> {
    return (await this.find(selector))[0]
  }

  async update (
    selector: Record<string, unknown>,
    update: Update,
    options: { multi?: boolean } = {}
  ): Promise<{ modified: number, original: T[], updated: T[] }> {
    const matches = await this.find(selector)
    const documents = options.multi === true ? matches : matches.slice(0, 1)
    const original = documents.map(document => ({ ...document }))

    for (const document of documents) {
      if (update.$set) Object.assign(document, update.$set)
      if (update.$inc) {
        for (const [key, increment] of Object.entries(update.$inc)) {
          const mutableDocument = document as Document
          const value = mutableDocument[key]
          if (typeof value !== 'number') {
            throw new TypeError(`Cannot increment non-numeric field: ${key}`)
          }
          mutableDocument[key] = value + increment
        }
      }
    }

    return { modified: documents.length, original, updated: documents.map(document => ({ ...document })) }
  }

  async count (selector: Record<string, unknown> = {}): Promise<number> {
    return (await this.find(selector)).length
  }
}

export interface ReviewDocument extends Document {
  product: number
  message: string
  author: string
  likesCount: number
  likedBy: string[]
  liked?: boolean
}

export interface OrderDocument extends Document {
  orderId: string
  email?: string
  totalPrice: number
  products: ProductModel[]
  bonus: number
  eta: string
  delivered: boolean
}

export const reviewsCollection = new InMemoryCollection<ReviewDocument>()
export const ordersCollection = new InMemoryCollection<OrderDocument>()
