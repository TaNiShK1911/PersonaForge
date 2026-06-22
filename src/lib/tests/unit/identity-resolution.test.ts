// ============================================================
// PersonaForge — Identity Resolution Tests
// ============================================================

import { describe, test, expect } from "bun:test";
import {
  resolveIdentities,
  buildIdentityGraph,
  type IdentitySignal,
} from "@/lib/identity/resolution";

describe("Identity Resolution", () => {
  test("deterministic matching: exact email match across channels", () => {
    const signals: IdentitySignal[] = [
      {
        id: "sig1",
        userId: "user1",
        signalType: "email",
        signalValue: "test@example.com",
        channel: "web",
        firstSeenAt: new Date("2024-01-01"),
        lastSeenAt: new Date("2024-01-02"),
      },
      {
        id: "sig2",
        userId: "user1",
        signalType: "email",
        signalValue: "test@example.com",
        channel: "app",
        firstSeenAt: new Date("2024-01-01"),
        lastSeenAt: new Date("2024-01-03"),
      },
    ];

    const matches = resolveIdentities(signals, false); // deterministic only
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].method).toBe("deterministic");
    expect(matches[0].matchScore).toBeGreaterThanOrEqual(0.95);
  });

  test("probabilistic matching: temporal overlap + channel proximity", () => {
    const signals: IdentitySignal[] = [
      {
        id: "sig1",
        userId: "user1",
        signalType: "device_id",
        signalValue: "dev123",
        channel: "web",
        firstSeenAt: new Date("2024-01-01T10:00:00"),
        lastSeenAt: new Date("2024-01-01T11:00:00"),
      },
      {
        id: "sig2",
        userId: "user1",
        signalType: "cookie_id",
        signalValue: "ck456",
        channel: "web",
        firstSeenAt: new Date("2024-01-01T10:30:00"),
        lastSeenAt: new Date("2024-01-01T11:30:00"),
      },
    ];

    const matches = resolveIdentities(signals, true);
    expect(matches.length).toBeGreaterThan(0);
    // May include probabilistic matches depending on threshold
  });

  test("identity graph building", () => {
    const signals: IdentitySignal[] = [
      {
        id: "sig1",
        userId: "user1",
        signalType: "email",
        signalValue: "test@example.com",
        channel: "email",
        firstSeenAt: new Date("2024-01-01"),
        lastSeenAt: new Date("2024-01-02"),
      },
      {
        id: "sig2",
        userId: "user1",
        signalType: "device_id",
        signalValue: "dev123",
        channel: "app",
        firstSeenAt: new Date("2024-01-01"),
        lastSeenAt: new Date("2024-01-03"),
      },
    ];

    const matches = resolveIdentities(signals, true);
    const graph = buildIdentityGraph("user1", signals, matches);

    expect(graph.userId).toBe("user1");
    expect(graph.nodes.length).toBe(2);
    expect(graph.fragmentedCount).toBe(2);
    expect(graph.resolutionConfidence).toBeGreaterThanOrEqual(0);
    expect(graph.resolutionConfidence).toBeLessThanOrEqual(1);
  });

  test("no matches for different users", () => {
    const signals: IdentitySignal[] = [
      {
        id: "sig1",
        userId: "user1",
        signalType: "email",
        signalValue: "user1@example.com",
        channel: "email",
        firstSeenAt: new Date("2024-01-01"),
        lastSeenAt: new Date("2024-01-02"),
      },
      {
        id: "sig2",
        userId: "user2",
        signalType: "email",
        signalValue: "user2@example.com",
        channel: "email",
        firstSeenAt: new Date("2024-01-01"),
        lastSeenAt: new Date("2024-01-03"),
      },
    ];

    const matches = resolveIdentities(signals, true);
    // Should not match across different users
    expect(matches.length).toBe(0);
  });
});
