import { AQI_LABELS } from "@/lib/constants";
import { categoryRank } from "@/lib/engine/aqi";
import { windowSpan as span } from "@/lib/engine/windows";
import type { AqiCategory, Audience, FactSheet, Language } from "@/lib/types";

const AQI_LABELS_HI: Record<AqiCategory, string> = {
  good: "अच्छी",
  satisfactory: "संतोषजनक",
  moderate: "मध्यम",
  poor: "खराब",
  very_poor: "बहुत खराब",
  severe: "गंभीर",
};

interface Copy {
  headline: (place: string, aqi: number, label: string) => string;
  cigarettes: (n: number) => string;
  best: (span: string) => string;
  worst: (span: string) => string;
  audience: Record<Audience, string>;
  heavy: string;
  light: string;
  collective: string;
  emergency: string;
}

const COPY: Record<Language, Copy> = {
  en: {
    headline: (place, aqi, label) => `Air quality alert for ${place}: AQI ${aqi} (${label})`,
    cigarettes: (n) => `• Breathing this air all day ≈ smoking ${n} cigarettes.`,
    best: (span) => `• Cleanest hours: ${span} — schedule any outdoor activity then.`,
    worst: (span) => `• Dirtiest hours: ${span} — keep windows shut and stay in.`,
    audience: {
      school:
        "• Move assembly, PE and recess indoors; let children with asthma keep inhalers at hand.",
      society: "• Guards, gardeners and domestic staff should get N95 masks and indoor breaks.",
      workplace: "• Allow work-from-home or staggered hours; move outdoor meetings inside.",
      family_group:
        "• Keep grandparents and children indoors in the cleanest room; check on elderly relatives.",
    },
    heavy: "• Wear a fitted N95 outside (not for children under 2); skip outdoor exercise.",
    light: "• Sensitive people should keep outdoor exertion short.",
    collective:
      "• Do not burn leaves or garbage — report open burning to your municipal helpline. Carpool or take the metro.",
    emergency: "Breathlessness or chest pain? Call 112 immediately.",
  },
  hi: {
    headline: (place, aqi, label) => `${place} के लिए वायु गुणवत्ता चेतावनी: AQI ${aqi} (${label})`,
    cigarettes: (n) => `• पूरे दिन यह हवा सांस में लेना ≈ ${n} सिगरेट पीने के बराबर।`,
    best: (span) => `• सबसे साफ़ समय: ${span} — बाहर के काम इसी समय करें।`,
    worst: (span) => `• सबसे प्रदूषित समय: ${span} — खिड़कियाँ बंद रखें, घर के अंदर रहें।`,
    audience: {
      school: "• प्रार्थना सभा, खेल और अवकाश कक्षा के अंदर करें; अस्थमा वाले बच्चे इनहेलर पास रखें।",
      society: "• गार्ड, माली और घरेलू कर्मचारियों को N95 मास्क और अंदर आराम का समय दें।",
      workplace: "• घर से काम या अलग-अलग समय की अनुमति दें; बाहर की बैठकें अंदर करें।",
      family_group: "• दादा-दादी और बच्चों को सबसे साफ़ कमरे में रखें; बुज़ुर्ग रिश्तेदारों का हाल पूछें।",
    },
    heavy: "• बाहर अच्छी तरह फिट N95 पहनें (2 साल से छोटे बच्चों को नहीं); बाहर व्यायाम न करें।",
    light: "• संवेदनशील लोग बाहर ज़्यादा मेहनत वाला काम कम करें।",
    collective:
      "• पत्ते या कचरा न जलाएँ — खुले में जलाने की शिकायत नगर निगम हेल्पलाइन पर करें। कारपूल करें या मेट्रो लें।",
    emergency: "सांस फूलना या सीने में दर्द? तुरंत 112 पर कॉल करें।",
  },
};

/** Ready-to-share advisory built from facts alone (used when Gemini is unavailable). */
export function buildRuleAdvisory(
  facts: FactSheet,
  audience: Audience,
  language: Language,
): string {
  const c = COPY[language];
  const label =
    language === "hi" ? AQI_LABELS_HI[facts.aqi.category] : AQI_LABELS[facts.aqi.category];
  const lines = [
    c.headline(facts.place, facts.aqi.value, label),
    "",
    c.cigarettes(facts.cigarettesPerDay),
  ];
  if (facts.bestWindow) lines.push(c.best(span(facts.bestWindow)));
  if (facts.worstWindow) lines.push(c.worst(span(facts.worstWindow)));
  lines.push(
    c.audience[audience],
    categoryRank(facts.aqi.category) >= categoryRank("poor") ? c.heavy : c.light,
    c.collective,
    "",
    c.emergency,
  );
  return lines.join("\n");
}
