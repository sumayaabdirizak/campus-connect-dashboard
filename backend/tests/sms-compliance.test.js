import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const evalMock = vi.fn();

vi.mock("ioredis", () => ({
  default: class MockRedis {
    eval(...args) {
      return evalMock(...args);
    }
    disconnect() {}
  },
}));

import {
  resetSmsRateLimitRedisForTests,
  tryConsumeSmsDailySlot,
} from "../src/features/announcements/services/smsRateLimit.service.js";
import {
  announcementMeetsSmsPriorityGate,
  minSmsPriorityRankFromEnv,
} from "../src/features/announcements/services/smsPriorityGate.service.js";

describe("smsPriorityGate", () => {
  const prev = process.env.ANNOUNCEMENT_SMS_MIN_PRIORITY;

  afterEach(() => {
    if (prev === undefined) delete process.env.ANNOUNCEMENT_SMS_MIN_PRIORITY;
    else process.env.ANNOUNCEMENT_SMS_MIN_PRIORITY = prev;
  });

  it("allows all priorities when env unset", () => {
    delete process.env.ANNOUNCEMENT_SMS_MIN_PRIORITY;
    expect(minSmsPriorityRankFromEnv()).toBe(1);
    expect(announcementMeetsSmsPriorityGate({ priority: "NORMAL" })).toBe(true);
  });

  it("URGENT gate blocks normal and important", () => {
    process.env.ANNOUNCEMENT_SMS_MIN_PRIORITY = "URGENT";
    expect(announcementMeetsSmsPriorityGate({ priority: "NORMAL" })).toBe(false);
    expect(announcementMeetsSmsPriorityGate({ priority: "IMPORTANT" })).toBe(false);
    expect(announcementMeetsSmsPriorityGate({ priority: "URGENT" })).toBe(true);
  });
});

describe("smsRateLimit", () => {
  beforeEach(() => {
    resetSmsRateLimitRedisForTests();
    evalMock.mockReset();
    process.env.REDIS_URL = "redis://mock:6379";
    process.env.ANNOUNCEMENT_SMS_DAILY_CAP = "3";
  });

  afterEach(() => {
    resetSmsRateLimitRedisForTests();
    delete process.env.REDIS_URL;
    delete process.env.ANNOUNCEMENT_SMS_DAILY_CAP;
  });

  it("allows when Lua returns 1", async () => {
    evalMock.mockResolvedValue(1);
    const r = await tryConsumeSmsDailySlot(7);
    expect(r.allowed).toBe(true);
    expect(r.usedRedis).toBe(true);
    expect(evalMock).toHaveBeenCalled();
  });

  it("blocks when Lua returns 0", async () => {
    evalMock.mockResolvedValue(0);
    const r = await tryConsumeSmsDailySlot(7);
    expect(r.allowed).toBe(false);
    expect(r.usedRedis).toBe(true);
  });

  it("allows when REDIS_URL unset (no limiter)", async () => {
    delete process.env.REDIS_URL;
    const r = await tryConsumeSmsDailySlot(7);
    expect(r.allowed).toBe(true);
    expect(r.usedRedis).toBe(false);
    expect(evalMock).not.toHaveBeenCalled();
  });
});
