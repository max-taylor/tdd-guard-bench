import { describe, it, expect } from 'vitest'
import { parse } from '../src/parse'

describe('parse', () => {
  it('parses a single row with comma-separated fields', () => {
    expect(parse('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  it('splits rows on newlines', () => {
    expect(parse('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('treats commas inside quoted fields as literal', () => {
    expect(parse('name,quote\nAlice,"hello, world"')).toEqual([
      ['name', 'quote'],
      ['Alice', 'hello, world'],
    ])
  })

  it('unescapes doubled double-quotes inside quoted fields', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  it('keeps newlines inside quoted fields as part of the field', () => {
    expect(parse('id,bio\n1,"line one\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\nline two'],
    ])
  })

  it('splits rows on CRLF', () => {
    expect(parse('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles a mix of CRLF and LF row separators', () => {
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

  it('preserves a bare CR (not followed by LF) in field content', () => {
    expect(parse('a\rb,c')).toEqual([['a\rb', 'c']])
  })
})
