import { Construction } from 'lucide-react'

interface Props { title: string }

export default function Placeholder({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <Construction className="w-12 h-12 mb-3 text-gray-300" />
      <h2 className="text-lg font-medium text-gray-500">{title}</h2>
      <p className="text-sm mt-1">此功能開發中</p>
    </div>
  )
}
