/** @jest-environment node */

import { hasPermission } from "@/lib/permissions";
import { canViewKautionen } from "./kautionen-recht";

const mockHasPermission = hasPermission as jest.Mock;

describe("canViewKautionen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("liefert das Modulrecht kautionen:ansehen (ja)", async () => {
    mockHasPermission.mockResolvedValue(true);
    await expect(canViewKautionen()).resolves.toBe(true);
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", "ansehen");
  });

  it("liefert das Modulrecht kautionen:ansehen (nein)", async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(canViewKautionen()).resolves.toBe(false);
  });
});
