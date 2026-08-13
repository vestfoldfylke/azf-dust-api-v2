type Condition = (value: unknown) => boolean
type Mask = (value: unknown) => string

const maskValues = (obj: unknown, condition: Condition, mask: Mask): void => {
  if (obj === null || typeof obj !== 'object') {
    return
  }

  const record: Record<string, unknown> = obj as Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === 'object') {
      maskValues(value, condition, mask)
      continue
    }

    if (condition(value)) {
      record[key] = mask(value)
    }
  }
}

const isPotentialSsn: Condition = (value) => Boolean(Number(value)) && String(value).length === 11

const maskSsn: Mask = (ssn) => {
  const birthdate: string = String(ssn).substring(0, 6)
  return `${birthdate}*****`
}

export const maskSsnValues = (obj: unknown): void => {
  maskValues(obj, isPotentialSsn, maskSsn)
}
