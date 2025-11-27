import * as React from "react"
import { Input } from "@/components/ui/input"

export interface NumberInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("")

    React.useEffect(() => {
      if (value === undefined || value === null) {
        setDisplayValue("")
      } else {
        // Convert dot to comma for display
        setDisplayValue(value.toString().replace('.', ','))
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      // Update display value immediately
      setDisplayValue(inputValue)

      // Convert German format (e.g. 1.234,56) to standard format (1234.56)
      const dotValue = inputValue.replace(/\./g, "").replace(",", ".")

      if (onChange) {
        // Create a proxy event that allows reading target.name and target.value
        const eventShim = {
          ...e,
          target: {
            ...e.target,
            value: dotValue,
            name: props.name || e.target.name,
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        onChange(eventShim);
      }
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
      />
    )
  }
)
NumberInput.displayName = "NumberInput"
