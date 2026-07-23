import { renderHook, act } from "@testing-library/react";
import { useTabParams } from "./use-tab-params";

// Mock next/navigation
let mockSearchParams = new URLSearchParams();
const mockPathname = "/organisation";

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
}));

describe("useTabParams", () => {
  const originalReplaceState = window.history.replaceState;
  const originalPushState = window.history.pushState;
  let replaceStateMock: jest.Mock;
  let pushStateMock: jest.Mock;

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    replaceStateMock = jest.fn();
    pushStateMock = jest.fn();
    window.history.replaceState = replaceStateMock;
    window.history.pushState = pushStateMock;
    delete (window as any).location;
    (window as any).location = new URL("http://localhost:3000/organisation");
  });

  afterEach(() => {
    window.history.replaceState = originalReplaceState;
    window.history.pushState = originalPushState;
  });

  it("should return default tab when no query parameter exists", () => {
    const { result } = renderHook(() =>
      useTabParams("overview", ["overview", "members", "policies"])
    );

    expect(result.current[0]).toBe("overview");
  });

  it("should return tab from searchParams if valid", () => {
    mockSearchParams = new URLSearchParams("tab=members");
    const { result } = renderHook(() =>
      useTabParams("overview", ["overview", "members", "policies"])
    );

    expect(result.current[0]).toBe("members");
  });

  it("should fallback to default tab if searchParams tab is invalid", () => {
    mockSearchParams = new URLSearchParams("tab=unknown");
    const { result } = renderHook(() =>
      useTabParams("overview", ["overview", "members", "policies"])
    );

    expect(result.current[0]).toBe("overview");
  });

  it("should update state and URL when setTab is called", () => {
    const { result } = renderHook(() =>
      useTabParams("overview", ["overview", "members", "policies"])
    );

    act(() => {
      result.current[1]("members");
    });

    expect(result.current[0]).toBe("members");
    expect(replaceStateMock).toHaveBeenCalledWith(
      null,
      "",
      "/organisation?tab=members"
    );
  });

  it("should remove tab param when switching back to default tab", () => {
    mockSearchParams = new URLSearchParams("tab=members");
    (window as any).location = new URL("http://localhost:3000/organisation?tab=members");

    const { result } = renderHook(() =>
      useTabParams("overview", ["overview", "members", "policies"])
    );

    act(() => {
      result.current[1]("overview");
    });

    expect(result.current[0]).toBe("overview");
    expect(replaceStateMock).toHaveBeenCalledWith(null, "", "/organisation");
  });

  it("should support custom paramName option", () => {
    mockSearchParams = new URLSearchParams("section=policies");
    const { result } = renderHook(() =>
      useTabParams("overview", ["overview", "members", "policies"], {
        paramName: "section",
      })
    );

    expect(result.current[0]).toBe("policies");

    act(() => {
      result.current[1]("members");
    });

    expect(result.current[0]).toBe("members");
    expect(replaceStateMock).toHaveBeenCalledWith(
      null,
      "",
      "/organisation?section=members"
    );
  });

  it("should use pushState when history mode is 'push'", () => {
    const { result } = renderHook(() =>
      useTabParams("overview", ["overview", "members"], { history: "push" })
    );

    act(() => {
      result.current[1]("members");
    });

    expect(pushStateMock).toHaveBeenCalledWith(
      null,
      "",
      "/organisation?tab=members"
    );
    expect(replaceStateMock).not.toHaveBeenCalled();
  });

  it("should dynamically update tab state when validValues updates post-mount", () => {
    mockSearchParams = new URLSearchParams("tab=bewerber");

    let validValues: ("mieter" | "overview" | "bewerber")[] = ["mieter", "overview"];

    const { result, rerender } = renderHook(() =>
      useTabParams("mieter", validValues)
    );

    // Initial render: "bewerber" is not in validValues, so falls back to "mieter"
    expect(result.current[0]).toBe("mieter");

    // Feature flag resolves post-mount, adding "bewerber" to validValues
    validValues = ["mieter", "overview", "bewerber"];
    rerender();

    // After validValues updates, hook re-evaluates searchParams and selects "bewerber"
    expect(result.current[0]).toBe("bewerber");
  });

  it("should update tab state when browser back/forward navigation changes searchParams after setTab", () => {
    const { result, rerender } = renderHook(() =>
      useTabParams("overview", ["overview", "members", "policies"])
    );

    // User switches tab to 'members' via setTab
    act(() => {
      result.current[1]("members");
    });
    expect(result.current[0]).toBe("members");

    // Simulate browser Back button: URL searchParams updates back to 'tab=overview'
    mockSearchParams = new URLSearchParams("tab=overview");
    rerender();

    // Hook should sync activeTab back to 'overview'
    expect(result.current[0]).toBe("overview");
  });
});
