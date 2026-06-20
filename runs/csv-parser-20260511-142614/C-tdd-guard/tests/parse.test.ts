import { describe, it, expect } from 'vitest'
import { parse } from '../src/parse'

describe('parse', () => {
  it('parses a single field', () => {
    expect(parse('a')).toEqual([['a']])
  })

  it('splits fields on commas', () => {
    expect(parse('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  it('splits rows on newlines', () => {
    expect(parse('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('keeps commas inside quoted fields', () => {
    expect(parse('name,quote\nAlice,"hello, world"')).toEqual([
      ['name', 'quote'],
      ['Alice', 'hello, world'],
    ])
  })

  it('treats doubled quotes inside a quoted field as a literal quote', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  it('preserves newlines inside quoted fields', () => {
    expect(parse('id,bio\n1,"line one\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\nline two'],
    ])
  })

  it('treats CRLF as a row separator', () => {
    expect(parse('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles mixed CRLF and LF row separators', () => {
    expect(parse('a,b\r\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('preserves CRLF inside quoted fields', () => {
    expect(parse('id,bio\r\n1,"line one\r\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\r\nline two'],
    ])
  })

  it('preserves a bare CR (not followed by LF) inside a field', () => {
    expect(parse('a\rb,c')).toEqual([['a\rb', 'c']])
  })
})
