import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Trash2 } from "lucide-react"
import { SelectionPill, SelectionPillAction } from "./selection-pill"

describe("SelectionPill", () => {
  it("renders nothing without a selection", () => {
    const { container } = render(
      <SelectionPill count={0} noun={["Haus", "Häuser"]} onClear={jest.fn()}>
        <SelectionPillAction>Exportieren</SelectionPillAction>
      </SelectionPill>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("names the selection in singular and plural", () => {
    const { rerender } = render(<SelectionPill count={1} noun={["Haus", "Häuser"]} onClear={jest.fn()}>{null}</SelectionPill>)
    expect(screen.getByText("1 Haus ausgewählt")).toBeInTheDocument()
    rerender(<SelectionPill count={3} noun={["Haus", "Häuser"]} onClear={jest.fn()}>{null}</SelectionPill>)
    expect(screen.getByText("3 Häuser ausgewählt")).toBeInTheDocument()
  })

  it("clears the selection and runs actions", async () => {
    const user = userEvent.setup()
    const onClear = jest.fn()
    const onDelete = jest.fn()
    render(
      <SelectionPill count={2} noun={["Haus", "Häuser"]} onClear={onClear}>
        <SelectionPillAction icon={Trash2} variant="destructive" onClick={onDelete}>
          Löschen
        </SelectionPillAction>
      </SelectionPill>,
    )

    expect(screen.getByRole("toolbar", { name: "Aktionen für die Auswahl" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Löschen" }))
    await user.click(screen.getByRole("button", { name: "Auswahl aufheben" }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
