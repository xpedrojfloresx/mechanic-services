import { Label } from '@/components/ui/label'

type FormFieldProps = {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
