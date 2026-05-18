import type { OFZBond, Coupon } from '@/types'

const BASE_URL = 'https://iss.moex.com/iss'

function parseColumns<T>(columns: string[], data: unknown[][]): T[] {
  return data.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]])) as T,
  )
}

export interface MoexSecurityRaw {
  SECID: string
  ISIN: string
  SHORTNAME: string
  FACEVALUE: number
  COUPONPERCENT: number
  COUPONVALUE: number
  COUPONFREQUENCY: number
  MATDATE: string
  NEXTCOUPON: string
  PREVWAPRICE: number
  YIELDATPREVWAPRICE: number
  ACCRUEDINT: number
  STATUS: string
}

const SEC_COLS = [
  'SECID', 'ISIN', 'SHORTNAME', 'FACEVALUE', 'STATUS',
  'MATDATE', 'COUPONFREQUENCY', 'COUPONPERCENT', 'COUPONVALUE',
  'ACCRUEDINT', 'NEXTCOUPON', 'PREVWAPRICE', 'YIELDATPREVWAPRICE',
].join(',')

function mapRawBond(b: MoexSecurityRaw): OFZBond {
  return {
    secId: b.SECID,
    isin: b.ISIN,
    shortName: b.SHORTNAME,
    faceValue: b.FACEVALUE || 1000,
    couponPercent: b.COUPONPERCENT ?? 0,
    couponValue: b.COUPONVALUE ?? 0,
    couponPeriod: b.COUPONFREQUENCY > 0 ? Math.round(365 / b.COUPONFREQUENCY) : 182,
    maturityDate: b.MATDATE,
    nextCouponDate: b.NEXTCOUPON ?? '',
    prevWapPrice: b.PREVWAPRICE ?? 0,
    yieldAtPrevWapPrice: b.YIELDATPREVWAPRICE ?? 0,
    accruedInterest: b.ACCRUEDINT ?? 0,
    status: b.STATUS,
  }
}

export async function fetchOFZBonds(): Promise<OFZBond[]> {
  const url = `${BASE_URL}/engines/stock/markets/bonds/boards/TQOB/securities.json?iss.meta=off&iss.only=securities&securities.columns=${SEC_COLS}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MOEX error: ${res.status}`)
  const json = await res.json()

  return parseColumns<MoexSecurityRaw>(json.securities.columns, json.securities.data)
    .filter(b => b.STATUS === 'A' && b.MATDATE && b.COUPONPERCENT > 0 && b.PREVWAPRICE > 0)
    .map(mapRawBond)
    .sort((a, b) => {
      const aSpecial = /^SU(29|52)/.test(a.secId)
      const bSpecial = /^SU(29|52)/.test(b.secId)
      if (aSpecial !== bSpecial) return aSpecial ? 1 : -1
      if (aSpecial) return a.maturityDate.localeCompare(b.maturityDate)
      return b.yieldAtPrevWapPrice - a.yieldAtPrevWapPrice
    })
}

export async function fetchBondDetails(secId: string): Promise<OFZBond> {
  const url = `${BASE_URL}/engines/stock/markets/bonds/boards/TQOB/securities/${secId}.json?iss.meta=off&iss.only=securities&securities.columns=${SEC_COLS}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MOEX error: ${res.status}`)
  const json = await res.json()

  const rows = parseColumns<MoexSecurityRaw>(json.securities.columns, json.securities.data)
  if (!rows[0]) throw new Error(`Bond ${secId} not found`)
  return mapRawBond(rows[0])
}

interface CouponRaw {
  isin: string
  coupondate: string
  recorddate: string | null
  startdate: string | null
  value: number | null
  valueprc: number | null
  value_rub: number | null
}

export async function fetchCoupons(secId: string): Promise<Coupon[]> {
  const url = `${BASE_URL}/securities/${secId}/bondization.json?iss.meta=off&iss.only=coupons&limit=unlimited`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MOEX error: ${res.status}`)
  const json = await res.json()

  return parseColumns<CouponRaw>(json.coupons.columns, json.coupons.data)
    .filter(c => c.coupondate && c.value_rub != null && c.value_rub > 0)
    .map(c => ({
      secId,
      couponDate: c.coupondate,
      recordDate: c.recorddate ?? '',
      startDate: c.startdate ?? '',
      value: c.value ?? 0,
      valuePrc: c.valueprc ?? 0,
      valueRub: c.value_rub ?? 0,
    }))
}

export { parseColumns, BASE_URL }
