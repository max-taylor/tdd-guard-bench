import { describe, it, expect } from 'vitest'
import { parse } from '../src/parse'

describe('parse', () => {
  it('parses a single row of plain fields', () => {
    expect(parse('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  it('parses multiple rows separated by newlines', () => {
    expect(parse('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('treats commas inside quoted fields as literal characters', () => {
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

  it('preserves newlines inside quoted fields', () => {
    expect(parse('id,bio\n1,"line one\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\nline two'],
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parse('')).toEqual([])
  })

  it('parses a single field', () => {
    expect(parse('hello')).toEqual([['hello']])
  })

  it('handles empty fields between commas', () => {
    expect(parse('a,,b')).toEqual([['a', '', 'b']])
  })

  it('handles leading and trailing empty fields', () => {
    expect(parse(',a,')).toEqual([['', 'a', '']])
  })

  it('handles a trailing newline by not producing a phantom empty row', () => {
    expect(parse('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('parses an empty quoted field', () => {
    expect(parse('a,"",b')).toEqual([['a', '', 'b']])
  })

  it('parses a quoted field containing only an escaped quote', () => {
    expect(parse('"""""')).toEqual([['""']])
  })

  it('handles multiple quoted fields in one row', () => {
    expect(parse('"a","b,c","d"')).toEqual([['a', 'b,c', 'd']])
  })

  it('handles mixed quoted and unquoted fields', () => {
    expect(parse('a,"b",c')).toEqual([['a', 'b', 'c']])
  })

  it('handles multiple newlines inside a quoted field', () => {
    expect(parse('"a\n\nb"')).toEqual([['a\n\nb']])
  })

  it('handles a row that consists only of an empty quoted field', () => {
    expect(parse('""')).toEqual([['']])
  })
})
