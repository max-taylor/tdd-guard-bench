import { describe, it, expect } from 'vitest'
import { parse } from '../src/parse.js'

describe('parse', () => {
  it('parses a simple two-row CSV', () => {
    expect(parse('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parse('')).toEqual([])
  })

  it('parses a single row with no trailing newline', () => {
    expect(parse('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  it('parses a single field', () => {
    expect(parse('hello')).toEqual([['hello']])
  })

  it('parses empty fields', () => {
    expect(parse('a,,c')).toEqual([['a', '', 'c']])
  })

  it('parses trailing empty field', () => {
    expect(parse('a,b,')).toEqual([['a', 'b', '']])
  })

  it('parses leading empty field', () => {
    expect(parse(',b,c')).toEqual([['', 'b', 'c']])
  })

  it('treats trailing newline as end of last row, not a new empty row', () => {
    expect(parse('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles quoted fields containing commas', () => {
    expect(parse('name,quote\nAlice,"hello, world"')).toEqual([
      ['name', 'quote'],
      ['Alice', 'hello, world'],
    ])
  })

  it('handles escaped double quotes inside quoted fields', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  it('handles newlines inside quoted fields', () => {
    expect(parse('id,bio\n1,"line one\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\nline two'],
    ])
  })

  it('handles quoted empty field', () => {
    expect(parse('a,"",c')).toEqual([['a', '', 'c']])
  })

  it('handles a fully quoted simple field', () => {
    expect(parse('"a","b","c"')).toEqual([['a', 'b', 'c']])
  })

  it('handles only escaped quotes in field', () => {
    expect(parse('""""')).toEqual([['"']])
  })

  it('handles CRLF line endings', () => {
    expect(parse('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles mixed CRLF and LF line endings', () => {
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

  it('preserves a bare CR as part of field content', () => {
    expect(parse('a\rb,c')).toEqual([['a\rb', 'c']])
  })

  it('handles multiple newlines inside quoted field', () => {
    expect(parse('"a\nb\nc"')).toEqual([['a\nb\nc']])
  })

  it('handles consecutive escaped quotes', () => {
    expect(parse('"a""""b"')).toEqual([['a""b']])
  })
})
