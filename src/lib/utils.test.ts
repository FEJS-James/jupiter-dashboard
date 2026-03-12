import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('combines class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
  })

  it('filters out falsy values', () => {
    expect(cn('base', undefined, null, false, 'visible')).toBe('base visible')
  })

  it('works with empty input', () => {
    expect(cn()).toBe('')
  })

  it('handles array inputs', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })
})