import { describe, expect, it } from "vitest";
import {
  emptyData,
  groupMembers,
  groupNumbers,
  groupPairs,
  isValidEmail,
  normalizeEmail,
  pairKey,
  participantProgress,
  signIn,
  toggleMeeting,
  GROUP_SIZE,
  type RRData,
} from "./store";

function withParticipants(emails: string[]): RRData {
  let data = emptyData();
  for (const email of emails) {
    data = signIn(data, email).data;
  }
  return data;
}

describe("email handling", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  A@B.Com ")).toBe("a@b.com");
  });

  it("validates emails and accepts the admin sentinel", () => {
    expect(isValidEmail("student@wisc.edu")).toBe(true);
    expect(isValidEmail("admin@admin")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("pairKey is order-independent", () => {
    expect(pairKey("b@x.com", "a@x.com")).toBe(pairKey("a@x.com", "b@x.com"));
  });
});

describe("signIn / group assignment", () => {
  it("assigns the first participant to group 1", () => {
    const { participant, isNew } = signIn(emptyData(), "p1@wisc.edu");
    expect(participant.group).toBe(1);
    expect(isNew).toBe(true);
  });

  it("keeps a returning participant in their group without duplicating", () => {
    let data = signIn(emptyData(), "p1@wisc.edu").data;
    const again = signIn(data, "P1@WISC.EDU");
    expect(again.isNew).toBe(false);
    expect(again.participant.group).toBe(1);
    expect(again.data.participants).toHaveLength(1);
  });

  it("never puts more than GROUP_SIZE people in a group and opens new groups", () => {
    const data = withParticipants(
      Array.from({ length: GROUP_SIZE * 2 + 1 }, (_, i) => `p${i}@wisc.edu`)
    );
    for (const g of groupNumbers(data)) {
      expect(groupMembers(data, g).length).toBeLessThanOrEqual(GROUP_SIZE);
    }
    expect(data.participants).toHaveLength(GROUP_SIZE * 2 + 1);
    expect(groupNumbers(data).length).toBeGreaterThanOrEqual(3);
  });
});

describe("pairs and meetings", () => {
  it("a full group of 5 has 10 within-group pairs", () => {
    let data = emptyData();
    // Force everyone into one group by filling sequentially from empty.
    for (let i = 0; i < GROUP_SIZE; i++) {
      data = signIn(data, `p${i}@wisc.edu`).data;
    }
    const groups = groupNumbers(data);
    const totalPairs = groups.reduce((n, g) => n + groupPairs(data, g).length, 0);
    // All in open groups; with one group of 5 that is C(5,2)=10; if randomness
    // split them (only possible via new-group creation, which requires full
    // groups), it cannot — first five always land in group 1.
    expect(groups).toEqual([1]);
    expect(totalPairs).toBe(10);
  });

  it("toggleMeeting marks a pair met and undoes it", () => {
    let data = withParticipants(["a@x.com", "b@x.com"]);
    data = toggleMeeting(data, "a@x.com", "b@x.com");
    expect(data.meetings[pairKey("a@x.com", "b@x.com")]).toBeTruthy();
    data = toggleMeeting(data, "b@x.com", "a@x.com");
    expect(data.meetings[pairKey("a@x.com", "b@x.com")]).toBeUndefined();
  });

  it("participantProgress reports met / remaining group partners", () => {
    let data = emptyData();
    for (const e of ["a@x.com", "b@x.com", "c@x.com"]) {
      data = signIn(data, e).data;
    }
    // First three all land in group 1 (only open group).
    data = toggleMeeting(data, "a@x.com", "b@x.com");
    const prog = participantProgress(data, "a@x.com");
    expect(prog.total).toBe(2);
    expect(prog.met).toBe(1);
    expect(prog.remaining).toEqual(["c@x.com"]);
  });
});
