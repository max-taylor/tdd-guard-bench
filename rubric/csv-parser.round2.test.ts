// Canonical csv-parser test suite.
// Round 2: includes round-1 tests (sections 1-6) plus section 7 (CRLF).
// __IMPL_IMPORT__ is substituted by harness/score-rubric.sh.

import { describe, it, expect } from 'vitest'
import { parse } from '__IMPL_IMPORT__'

describe('1. core parsing', () => {
  it('1.1 single row no newline', () => {
    expect(parse('a,b,c')).toEqual([['a', 'b', 'c']])
  })

  it('1.2 two rows lf separated', () => {
    expect(parse('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('1.3 single field row', () => {
    expect(parse('hello')).toEqual([['hello']])
  })
})

describe('2. empty fields', () => {
  it('2.1 empty field in middle', () => {
    expect(parse('a,,b')).toEqual([['a', '', 'b']])
  })

  it('2.2 empty field at start', () => {
    expect(parse(',a,b')).toEqual([['', 'a', 'b']])
  })

  it('2.3 empty field at end', () => {
    expect(parse('a,b,')).toEqual([['a', 'b', '']])
  })

  it('2.4 empty quoted field', () => {
    expect(parse('a,"",b')).toEqual([['a', '', 'b']])
  })
})

describe('3. quoted fields', () => {
  it('3.1 comma inside quoted field', () => {
    expect(parse('name,quote\nAlice,"hello, world"')).toEqual([
      ['name', 'quote'],
      ['Alice', 'hello, world'],
    ])
  })

  it('3.2 escaped quote inside quoted field', () => {
    expect(parse('id,note\n1,"she said ""hi"""')).toEqual([
      ['id', 'note'],
      ['1', 'she said "hi"'],
    ])
  })

  it('3.3 newline inside quoted field', () => {
    expect(parse('id,bio\n1,"line one\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\nline two'],
    ])
  })

  it('3.4 quoted field at start of row', () => {
    expect(parse('"a",b,c')).toEqual([['a', 'b', 'c']])
  })

  it('3.5 multiple quoted fields per row', () => {
    expect(parse('"a","b","c"')).toEqual([['a', 'b', 'c']])
  })

  it('3.6 only-quotes field', () => {
    expect(parse('""""')).toEqual([['"']])
  })
})

describe('4. content edge cases', () => {
  it('4.1 unicode content', () => {
    expect(parse('café,日本,🎉')).toEqual([['café', '日本', '🎉']])
  })

  it('4.2 long field', () => {
    const long = 'x'.repeat(10000)
    expect(parse(`a,${long},b`)).toEqual([['a', long, 'b']])
  })
})

describe('5. CRLF round 2', () => {
  it('5.1 CRLF row separator', () => {
    expect(parse('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('5.2 mixed CRLF and LF separators', () => {
    expect(parse('a,b\r\n1,2\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
  })

  it('5.3 CRLF preserved inside quoted field', () => {
    expect(parse('id,bio\r\n1,"line one\r\nline two"')).toEqual([
      ['id', 'bio'],
      ['1', 'line one\r\nline two'],
    ])
  })

  it('5.4 bare CR preserved as field content', () => {
    expect(parse('a\rb,c')).toEqual([['a\rb', 'c']])
  })
})
