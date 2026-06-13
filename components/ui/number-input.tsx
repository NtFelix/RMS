import * as React from "react"
import { Input } from "@/components/ui/input"

export interface NumberInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const NumberInput = ({ value, onChange, ...props }: NumberInputProps) => {
  const [displayValue, setDisplayValue] = React.useState(() =>
    value === undefined || value === null ? "" : value.toString().replace('.', ',')
  )
  const [prevValue, setPrevValue] = React.useState(value)

  if (value !== prevValue) {
    setPrevValue(value)
    setDisplayValue(value === undefined || value === null ? "" : value.toString().replace('.', ','))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Update display value immediately
    setDisplayValue(inputValue)

    // Convert German format (e.g. 1.234,56) to standard format (1234.56)
    const dotValue = inputValue.includes(",")
      ? inputValue.replace(/\./g, "").replace(",", ".")
      : inputValue;

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
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleInputChange}
    />
  )
}

NumberInput.displayName = "NumberInput"
