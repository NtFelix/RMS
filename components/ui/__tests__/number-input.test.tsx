import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { NumberInput } from "../number-input"

describe("NumberInput", () => {
  it("formats initial value with comma", () => {
    render(<NumberInput value="2.5" onChange={() => {}} />)
    const input = screen.getByRole("textbox") as HTMLInputElement
    expect(input.value).toBe("2,5")
  })

  it("handles undefined value by showing empty string", () => {
    render(<NumberInput value={undefined} onChange={() => {}} />)
    const input = screen.getByRole("textbox") as HTMLInputElement
    expect(input.value).toBe("")
  })

  it("calls onChange with dot format when typing comma", () => {
    const handleChange = jest.fn()
    render(<NumberInput value="" onChange={handleChange} name="test-field" />)
    const input = screen.getByRole("textbox") as HTMLInputElement

    // User types "2,5"
    fireEvent.change(input, { target: { value: "2,5" } })

    expect(input.value).toBe("2,5")

    expect(handleChange).toHaveBeenCalled()
    const event = handleChange.mock.calls[0][0]
    expect(event.target.value).toBe("2.5")
    expect(event.target.name).toBe("test-field")
  })

  it("calls onChange with dot format when typing dot", () => {
    const handleChange = jest.fn()
    render(<NumberInput value="" onChange={handleChange} />)
    const input = screen.getByRole("textbox") as HTMLInputElement

    // User types "2.5"
    fireEvent.change(input, { target: { value: "2.5" } })

    expect(input.value).toBe("2.5")

    expect(handleChange).toHaveBeenCalled()
    expect(handleChange.mock.calls[0][0].target.value).toBe("2.5")
  })
})
