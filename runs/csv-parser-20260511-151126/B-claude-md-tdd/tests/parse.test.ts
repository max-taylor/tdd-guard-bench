import { describe, it, expect } from 'vitest'
import { parse } from '../src/parse'

describe('parse', () => {
  it('parses a single row of comma-separated fields', () => {
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

  it('treats two consecutive double quotes inside a quoted field as a literal quote', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  it('preserves newlines inside a quoted field without terminating the row', () => {
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

  it('preserves CRLF inside a quoted field', () => {
    expect(parse('id,bio\r\n1,"line one\r\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\r\nline two'],
    ])
  })

  it('preserves a bare carriage return inside an unquoted field', () => {
    expect(parse('a\rb,c')).toEqual([['a\rb', 'c']])
  })
})
