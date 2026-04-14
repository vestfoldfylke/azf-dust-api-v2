const maskValues = (obj, condition, mask) => {
  if (typeof obj !== 'object') {
    return
  }

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      maskValues(value, condition, mask)
      continue
    }

    if (condition(value)) {
      obj[key] = mask(value)
    }
  }
}

const isPotentialSsn = (value) => Number(value) && value.toString().length === 11

const maskSsn = (ssn) => {
  const birthdate = ssn.toString().substring(0, 6)
  return `${birthdate}*****`
}

const maskSsnValues = (obj) => {
  maskValues(obj, isPotentialSsn, maskSsn)
}

module.exports = { maskSsnValues }
