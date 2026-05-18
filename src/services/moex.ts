import type { OFZBond, Coupon } from '@/types'

const BASE_URL = 'https://iss.moex.com/iss'

/** Parse MOEX ISS column-array response into typed objects */
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
  COUPONPERIOD: number
  MATDATE: string
  NEXTCOUPON: string
  PREVWAPRICE: number
  YIELDATPREVWAPRICE: number
  ACCRUEDINT: number
  STATUS: string
}

/** Fetch list of active OFZ bonds with market data */
export async function fetchOFZBonds(): Promise<OFZBond[]> {
  // TODO: implement
  throw new Error('Not implemented')
}

/** Fetch details for a single bond by SECID */
export async function fetchBondDetails(secId: string): Promise<OFZBond> {
  // TODO: implement
  void secId
  throw new Error('Not implemented')
}

/** Fetch coupon payment schedule for a bond */
export async function fetchCoupons(secId: string): Promise<Coupon[]> {
  // TODO: implement
  void secId
  throw new Error('Not implemented')
}

// Export for reuse in unit tests
export { parseColumns, BASE_URL }
