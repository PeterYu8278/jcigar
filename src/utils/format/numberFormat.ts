/**
 * Converts a numeric amount into English words (Ringgit Malaysia format)
 */
export const numberToEnglishWords = (amount: number) => {
  const ones = [
    'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ]
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

  const toWordsUnder1000 = (n: number): string => {
    const parts: string[] = []
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    if (hundred > 0) parts.push(`${ones[hundred]} HUNDRED`)
    if (rest > 0) {
      if (rest < 20) parts.push(ones[rest])
      else {
        const t = Math.floor(rest / 10)
        const o = rest % 10
        parts.push(o ? `${tens[t]}-${ones[o]}` : tens[t])
      }
    }
    return parts.join(' ')
  }

  const toWords = (n: number): string => {
    if (n === 0) return 'ZERO'
    const parts: string[] = []
    const millions = Math.floor(n / 1_000_000)
    const thousands = Math.floor((n % 1_000_000) / 1_000)
    const remainder = n % 1_000
    if (millions) parts.push(`${toWordsUnder1000(millions)} MILLION`)
    if (thousands) parts.push(`${toWordsUnder1000(thousands)} THOUSAND`)
    if (remainder) parts.push(toWordsUnder1000(remainder))
    return parts.join(' ')
  }

  const safe = Number.isFinite(amount) ? amount : 0
  const ringgit = Math.floor(safe)
  const cents = Math.round((safe - ringgit) * 100)
  const ringgitWords = toWords(ringgit)
  const centsWords = toWords(cents)
  return `${ringgitWords}${cents > 0 ? ` AND ${centsWords} CENTS` : ''}`
}
