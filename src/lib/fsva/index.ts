import { calculateAllIndicators, RawIndicatorInput } from './form1-calculator'
import { calculateFSVAResult, FSVAResult } from './composite-score'

export interface FSVAFullResult extends FSVAResult {
  kode_bps: string
  tahun: number
}

export function processFSVAData(data: (RawIndicatorInput & { kode_bps: string, tahun: number })[]): FSVAFullResult[] {
  return data.map(item => {
    const indicators = calculateAllIndicators(item)
    const result = calculateFSVAResult(indicators)
    
    return {
      ...result,
      kode_bps: item.kode_bps,
      tahun: item.tahun,
    }
  })
}
