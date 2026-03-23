/// <reference types="jest" />

jest.mock("../../config/supabaseClient", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock("../requestCache.service", () => ({
  RequestCacheService: {
    invalidateUserContext: jest.fn(),
  },
}));

jest.mock("../chat.service", () => ({
  ChatService: {
    ensureGeneralConversation: jest.fn(),
  },
}));

import { prisma } from "../../lib/prisma";
import { RequestCacheService } from "../requestCache.service";
import { CompanyService } from "../company.service";

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedRequestCacheService =
  RequestCacheService as jest.Mocked<typeof RequestCacheService>;

describe("CompanyService.deleteById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes the workspace and reassigns impacted users without throwing", async () => {
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([{ user_id: "user-1" }, { user_id: "user-2" }])
      .mockResolvedValueOnce([{ id: "company-1" }])
      .mockResolvedValueOnce([{ company_id: "company-2" }])
      .mockResolvedValueOnce([]);

    const executeRaw = jest.fn().mockResolvedValue(1);

    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        $queryRaw: queryRaw,
        $executeRaw: executeRaw,
      }),
    );

    await expect(CompanyService.deleteById("company-1")).resolves.toBeUndefined();

    expect(executeRaw).toHaveBeenCalledTimes(2);
    expect(mockedRequestCacheService.invalidateUserContext).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(mockedRequestCacheService.invalidateUserContext).toHaveBeenCalledWith({
      userId: "user-2",
    });
  });

  it("throws a not-found error when the workspace delete affects no rows", async () => {
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([{ user_id: "user-1" }])
      .mockResolvedValueOnce([]);

    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        $queryRaw: queryRaw,
        $executeRaw: jest.fn(),
      }),
    );

    await expect(CompanyService.deleteById("missing-company")).rejects.toThrow(
      "Company not found",
    );

    expect(mockedRequestCacheService.invalidateUserContext).not.toHaveBeenCalled();
  });
});
