export function parse(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let fieldStarted = false
  let i = 0

  while (i < input.length) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }

    if (char === '"') {
      inQuotes = true
      fieldStarted = true
      i++
      continue
    }

    if (char === ',') {
      row.push(field)
      field = ''
      fieldStarted = true
      i++
      continue
    }

    if (char === '\r' && input[i + 1] === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      fieldStarted = false
      i += 2
      continue
    }

    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      fieldStarted = false
      i++
      continue
    }

    field += char
    fieldStarted = true
    i++
  }

  if (fieldStarted || field.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}
