import { describe, it, expect } from 'vitest'
import { parse } from '../src/parse.js'

describe('parse', () => {
  it('parses a simple two-row CSV', () => {
    expect(parse('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles a quoted field containing a comma', () => {
    expect(parse('name,quote\nAlice,"hello, world"')).toEqual([
      ['name', 'quote'],
      ['Alice', 'hello, world'],
    ])
  })

  it('handles escaped double quotes inside a quoted field', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  it('handles newlines inside a quoted field', () => {
    expect(parse('id,bio\n1,"line one\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\nline two'],
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parse('')).toEqual([])
  })

  it('parses a single row with no newline', () => {
    expect(parse('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  it('handles empty fields', () => {
    expect(parse('a,,c')).toEqual([['a', '', 'c']])
  })

  it('handles trailing empty field', () => {
    expect(parse('a,b,')).toEqual([['a', 'b', '']])
  })

  it('handles leading empty field', () => {
    expect(parse(',b,c')).toEqual([['', 'b', 'c']])
  })

  it('handles a trailing newline', () => {
    expect(parse('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles CRLF line endings', () => {
    expect(parse('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles an empty quoted field', () => {
    expect(parse('a,"",c')).toEqual([['a', '', 'c']])
  })

  it('handles a field that is just an escaped quote', () => {
    expect(parse('"""""')).toEqual([['""']])
  })

  it('handles multiple quoted fields in a row', () => {
    expect(parse('"a","b","c"')).toEqual([['a', 'b', 'c']])
  })
})
