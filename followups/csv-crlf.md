# Follow-up: CRLF line endings

## New requirement
The parser must also accept CRLF (`\r\n`) as a row separator, not just `\n`.

## Behaviour
- A `\r\n` sequence between rows ends the row in the same way `\n` currently does.
- Inside a quoted field, `\r\n` is preserved as part of the field content (just like `\n` currently is).
- A bare `\r` (not followed by `\n`) is preserved as part of the current field's content.

## Examples

    parse('a,b\r\n1,2')
    // → [['a', 'b'], ['1', '2']]

    parse('a,b\r\n1,2\n3,4')
    // → [['a', 'b'], ['1', '2'], ['3', '4']]

    parse('id,bio\r\n1,"line one\r\nline two"')
    // → [['id', 'bio'], ['1', 'line one\r\nline two']]
