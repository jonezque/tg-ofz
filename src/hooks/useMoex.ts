import { useQuery } from '@tanstack/react-query'
import { fetchOFZBonds, fetchBondDetails, fetchCoupons } from '@/services/moex'

export function useOFZBonds() {
  return useQuery({
    queryKey: ['ofz-bonds'],
    queryFn: fetchOFZBonds,
    staleTime: 60_000,
  })
}

export function useBondDetails(secId: string) {
  return useQuery({
    queryKey: ['bond', secId],
    queryFn: () => fetchBondDetails(secId),
    enabled: Boolean(secId),
    staleTime: 60_000,
  })
}

export function useCoupons(secId: string) {
  return useQuery({
    queryKey: ['coupons', secId],
    queryFn: () => fetchCoupons(secId),
    enabled: Boolean(secId),
    staleTime: 5 * 60_000,
  })
}
