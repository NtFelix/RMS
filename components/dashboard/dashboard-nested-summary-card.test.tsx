import React from "react";
import { render, screen } from "@testing-library/react";
import {
  DashboardNestedSummaryCard,
  DashboardNestedSummaryCardSkeleton,
} from "./dashboard-nested-summary-card";
import { Building2 } from "lucide-react";

describe("DashboardNestedSummaryCard", () => {
  it("renders with title, value, description, and icon", () => {
    render(
      <DashboardNestedSummaryCard
        href="/haeuser"
        title="Häuser"
        value={12}
        description="Verwaltete Immobilien"
        icon={<Building2 data-testid="icon" />}
      />
    );

    expect(screen.getByText("Häuser")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Verwaltete Immobilien")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Häuser: 12 - Verwaltete Immobilien/i });
    expect(link).toHaveAttribute("href", "/haeuser");
  });

  it("renders optional badge when provided", () => {
    render(
      <DashboardNestedSummaryCard
        href="/finanzen"
        title="Einnahmen"
        value="€ 4.500,00"
        badge="/Monat"
        description="Monatliche Mieteinnahmen"
        icon={<Building2 />}
      />
    );

    expect(screen.getByText("€ 4.500,00")).toBeInTheDocument();
    expect(screen.getByText("/Monat")).toBeInTheDocument();
  });

  it("renders skeleton correctly", () => {
    const { container } = render(
      <DashboardNestedSummaryCardSkeleton className="test-skeleton" />
    );

    expect(container.querySelector(".test-skeleton")).toBeInTheDocument();
  });
});
