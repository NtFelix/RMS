/**
 * Tests des Bewerber-Import-Modals: Hinweis-Toast bei Teilerfolg bzw. Warnung.
 * Alle Daten sind synthetische Platzhalter (Erika Muster, example.com).
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicantImportModal } from "@/components/tenants/applicant-import-modal";
import { toast } from "@/hooks/use-toast";
import {
  searchMailSenders,
  getMailsBySender,
  createApplicantsFromMails,
  checkWorkerQueueStatus,
  type CreateApplicantsResult,
} from "@/app/mieter-import-actions";

jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("@/app/mieter-import-actions", () => ({
  searchMailSenders: jest.fn(),
  getMailsBySender: jest.fn(),
  createApplicantsFromMails: jest.fn(),
  checkWorkerQueueStatus: jest.fn(),
}));
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandInput: ({ value, onValueChange, placeholder }: { value: string; onValueChange: (v: string) => void; placeholder?: string }) => (
    <input placeholder={placeholder} value={value} onChange={(e) => onValueChange(e.target.value)} />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) => <button onClick={onSelect}>{children}</button>,
}));
jest.mock("@/components/ui/date-picker", () => ({ DatePicker: () => null }));

const MAIL = { id: "m1", absender: "Erika Muster <erika@example.com>", betreff: "Bewerbung", datum_erhalten: "2026-01-05T10:00:00Z", dateipfad: "/p/1" };
const toastMock = toast as unknown as jest.Mock;

async function importiereMitErgebnis(ergebnis: CreateApplicantsResult, onOpenChange = jest.fn()) {
  (searchMailSenders as jest.Mock).mockResolvedValue(["erika@example.com"]);
  (getMailsBySender as jest.Mock).mockResolvedValue([MAIL]);
  (createApplicantsFromMails as jest.Mock).mockResolvedValue(ergebnis);
  const user = userEvent.setup();
  render(<ApplicantImportModal open onOpenChange={onOpenChange} />);
  await user.type(screen.getByPlaceholderText(/E-Mail oder Name/), "erika");
  await user.click(await screen.findByText("erika@example.com"));
  await user.click(await screen.findByRole("button", { name: /Importieren/ }));
  return { onOpenChange };
}

describe("ApplicantImportModal", () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (checkWorkerQueueStatus as jest.Mock).mockResolvedValue({ hasMore: false, success: true });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("zeigt bei Teilerfolg einen Hinweis-Toast statt des Erfolgstexts und fragt die Queue ab", async () => {
    await importiereMitErgebnis({
      success: true, count: 1, queued: 1, hasMore: true, userId: "u-1",
      message: "x", failedCount: 2, error: "Import partially failed: boom",
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: "Import teilweise erfolgreich",
        variant: "destructive",
        description: expect.stringContaining("2 konnten nicht angelegt werden"),
      }))
    );
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Import erfolgreich" }));
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining("boom"),
    }));
    expect(consoleWarnSpy).toHaveBeenCalledWith("Applicant import partial error:", "Import partially failed: boom");
    expect(checkWorkerQueueStatus).toHaveBeenCalledWith("u-1");
  });

  it("zeigt bei Warnung einen neutralen Hinweis ohne technische Serverdetails", async () => {
    await importiereMitErgebnis({
      success: true, count: 1, queued: 1, hasMore: true, userId: "u-1",
      message: "x", warning: "AI Processing kickoff failed",
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: "Import mit Hinweis",
        description: expect.stringContaining("Die AI-Analyse konnte nicht vollständig gestartet werden"),
      }))
    );
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringContaining("kickoff failed"),
    }));
    expect(consoleWarnSpy).toHaveBeenCalledWith("Applicant import warning:", "AI Processing kickoff failed");
  });

  it("kombiniert bei gleichzeitigem Teilfehler und AI-Warnung beide Hinweise im Toast", async () => {
    await importiereMitErgebnis({
      success: true, count: 2, queued: 2, hasMore: true, userId: "u-1",
      message: "x", failedCount: 1, error: "Import partially failed: db down",
      warning: "AI Processing kickoff failed: Worker 500",
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: "Import teilweise erfolgreich",
        variant: "destructive",
        description: expect.stringMatching(/2 Bewerber wurden angelegt\..*1 konnten nicht angelegt werden\..*Die AI-Analyse konnte nicht vollständig gestartet werden\./),
      }))
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith("Applicant import partial error:", "Import partially failed: db down");
    expect(consoleWarnSpy).toHaveBeenCalledWith("Applicant import warning:", "AI Processing kickoff failed: Worker 500");
  });

  it("warnt bei Teilerfolg vor Duplikaten statt zum sofortigen erneuten Import aufzufordern", async () => {
    await importiereMitErgebnis({
      success: true, count: 3, queued: 3, hasMore: true, userId: "u-1",
      message: "x", failedCount: 2, error: "Import partially failed: db down",
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        description: expect.stringContaining("keine Duplikate entstehen"),
      }))
    );
  });

  it("zeigt bei vollem Erfolg weiterhin den Erfolgstext", async () => {
    await importiereMitErgebnis({
      success: true, count: 3, queued: 3, hasMore: true, userId: "u-1", message: "x",
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Import erfolgreich" }))
    );
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Import mit Hinweis" }));
  });

  it("zeigt bei komplettem Fehlschlag den Fehler-Toast, lässt das Modal offen und startet kein Queue-Polling", async () => {
    const { onOpenChange } = await importiereMitErgebnis({
      success: false, count: 0, error: "Keine Berechtigung",
    });
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Import fehlgeschlagen",
        description: "Keine Berechtigung",
        variant: "destructive",
      })
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(checkWorkerQueueStatus).not.toHaveBeenCalled();
  });
});
