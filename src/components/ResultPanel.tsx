import type { TowerResults } from '../lib/model'
import PsychrometricChart from './PsychrometricChart'

export default function ResultPanel({ r }: { r: TowerResults }) {
  return (
    <div className="results">
      <PsychrometricChart r={r} />
    </div>
  )
}
