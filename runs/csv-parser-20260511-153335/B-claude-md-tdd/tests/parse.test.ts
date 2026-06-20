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

  it('keeps commas inside a quoted field as part of the field', () => {
    expect(parse('name,quote\nAlice,"hello, world"')).toEqual([
      ['name', 'quote'],
      ['Alice', 'hello, world'],
    ])
  })

  it('treats two consecutive double quotes inside a quoted field as a literal double quote', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  it('allows a quoted field to span multiple lines', () => {
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

  it('preserves a bare CR (not followed by LF) as field content', () => {
    expect(parse('a\rb,c')).toEqual([['a\rb', 'c']])
  })

  it('handles mixed CRLF and LF row separators', () => {
    expect(parse('a,b\r\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })
})
