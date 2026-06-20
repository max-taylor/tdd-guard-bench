import { describe, expect, test } from 'vitest'
import { parse } from '../src/parse'

describe('parse', () => {
  test('parses a single row of unquoted fields', () => {
    expect(parse('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  test('splits rows on newlines', () => {
    expect(parse('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  test('keeps commas inside quoted fields', () => {
    expect(parse('name,quote\nAlice,"hello, world"')).toEqual([
      ['name', 'quote'],
      ['Alice', 'hello, world'],
    ])
  })

  test('treats doubled quotes inside quoted field as a literal quote', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  test('keeps newlines inside quoted fields', () => {
    expect(parse('id,bio\n1,"line one\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\nline two'],
    ])
  })

  test('treats CRLF as a row separator', () => {
    expect(parse('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  test('preserves CRLF inside quoted fields', () => {
    expect(parse('id,bio\r\n1,"line one\r\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\r\nline two'],
    ])
  })

  test('preserves a bare CR as part of the field', () => {
    expect(parse('a\rb,c')).toEqual([['a\rb', 'c']])
  })
})
