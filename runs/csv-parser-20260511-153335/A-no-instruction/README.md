# CSV Parser

## Context
A CSV parser for a Node.js data ingestion service. The service receives
CSV-formatted strings from various sources and needs to extract structured
row data for downstream processing.

## Interface
Implement a `parse` function with the following signature:

    function parse(input: string): string[][]

The function returns the parsed rows as an array of string arrays, where
each inner array represents one row's fields in order.

## Functional requirements
1. Fields within a row are separated by commas.
2. Rows are separated by newlines.
3. Fields may be quoted with double quotes (`"`). When quoted, commas
   inside the field do not separate fields.
4. A literal double quote inside a quoted field is represented by two
   consecutive double quotes (`""`).
5. A quoted field may span multiple lines — newlines inside the quotes
   do not terminate the row.

## Examples

    parse('a,b,c\n1,2,3')
    // → [['a', 'b', 'c'], ['1', '2', '3']]

    parse('name,quote\nAlice,"hello, world"')
    // → [['name', 'quote'], ['Alice', 'hello, world']]

    parse('id,note\n1,"she said ""hi"""')
    // → [['id', 'note'], ['1', 'she said "hi"']]

    parse('id,bio\n1,"line one\nline two"')
    // → [['id', 'bio'], ['1', 'line one\nline two']]

## Constraints
- TypeScript, strict mode
- No external runtime dependencies
- Source in `src/`
