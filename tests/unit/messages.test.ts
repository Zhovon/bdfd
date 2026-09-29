import { describe, expect, it } from "vitest";
import { en } from "@/lib/dictionaries/en";
import { bn } from "@/lib/dictionaries/bn";
import {
  buildEmail,
  formatTaka,
  interpolate,
  parseNotification,
  renderNotification,
} from "@/lib/messages";

describe("interpolate", () => {
  it("fills placeholders and leaves unknown ones", () => {
    expect(interpolate("Hi {name}, {x}", { name: "Rahima" })).toBe("Hi Rahima, {x}");
    expect(interpolate("{n} left", { n: 3 })).toBe("3 left");
  });
});

describe("formatTaka", () => {
  it("uses Western digits in English and Bangla digits in Bangla", () => {
    expect(formatTaka(3500, en.intl)).toBe("৳ 3,500");
    expect(formatTaka(3500, bn.intl)).toBe("৳ ৩,৫০০");
  });
});

describe("renderNotification", () => {
  it("renders the same message in each language", () => {
    const msg = { kind: "paymentConfirmed", amount: 3500, tour: true } as const;
    expect(renderNotification(msg, en)).toEqual({
      title: "Participation confirmed",
      body: "Your ৳ 3,500 payment has been confirmed. Thank you.",
    });
    expect(renderNotification(msg, bn).body).toContain("৩,৫০০");
  });

  it("keeps a notice's own title as written", () => {
    const msg = { kind: "newNotice", board: "travel", noticeTitle: "Sylhet tour" } as const;
    expect(renderNotification(msg, bn)).toEqual({
      title: `নতুন নোটিশ · ${bn.boards.travel.title}`,
      body: "Sylhet tour",
    });
  });
});

describe("parseNotification", () => {
  it("round-trips stored kind + params", () => {
    expect(parseNotification("paymentRejected", { amount: 100, tour: false })).toEqual({
      kind: "paymentRejected",
      amount: 100,
      tour: false,
    });
    expect(parseNotification("accountApproved", null)).toEqual({ kind: "accountApproved" });
  });

  it("returns null for legacy rows and malformed params", () => {
    expect(parseNotification(null, null)).toBeNull();
    expect(parseNotification("paymentConfirmed", { amount: "100" })).toBeNull();
    expect(parseNotification("somethingElse", {})).toBeNull();
  });
});

describe("buildEmail", () => {
  it("sends Bangla first, then English, under a combined subject", () => {
    const mail = buildEmail({ kind: "approved", name: "Rahima Begum" });
    expect(mail.subject).toBe(`${bn.email.approvedSubject} / ${en.email.approvedSubject}`);
    expect(mail.text.indexOf("প্রিয় Rahima Begum")).toBeLessThan(mail.text.indexOf("Dear Rahima Begum"));
    expect(mail.text).toContain(en.brand.name);
    expect(mail.text).toContain(bn.brand.name);
  });

  it("puts the reset link in both languages", () => {
    const url = "https://portal.example/reset?token=abc";
    const mail = buildEmail({ kind: "reset", name: "A", url });
    expect(mail.text.split(url)).toHaveLength(3);
  });
});

describe("dictionaries", () => {
  it("have the same keys in Bangla and English", () => {
    const keys = (o: object, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    expect(keys(bn).sort()).toEqual(keys(en).sort());
  });
});
