import type { Lang, PaletteId, TemplateId } from "./themes";

export type Occasion = {
  id: string;
  emoji: string;
  name: Record<Lang, string>;
  /** Shown on the landing grid and SEO copy. */
  blurb: string;
  titlePlaceholder: Record<Lang, string>;
  hostPlaceholder: Record<Lang, string>;
  kicker: Record<Lang, string>;
  message: Record<Lang, string>;
  template: TemplateId;
  palette: PaletteId;
};

export const OCCASIONS = [
  {
    id: "birthday",
    emoji: "🎂",
    name: { en: "Birthday", hi: "जन्मदिन" },
    blurb: "Kids' parties, milestone birthdays, surprise bashes",
    titlePlaceholder: { en: "Aarav's 5th Birthday", hi: "आरव का 5वाँ जन्मदिन" },
    hostPlaceholder: { en: "Neha & Rohit", hi: "नेहा और रोहित" },
    kicker: { en: "You're invited to", hi: "आप सादर आमंत्रित हैं" },
    message: {
      en: "Join us for cake, games and lots of fun!",
      hi: "केक, खेल और ढेर सारी मस्ती के लिए ज़रूर आइए!",
    },
    template: "confetti",
    palette: "rose",
  },
  {
    id: "anniversary",
    emoji: "💞",
    name: { en: "Anniversary", hi: "सालगिरह" },
    blurb: "Silver jubilees, 1st anniversaries, vow renewals",
    titlePlaceholder: { en: "Sharma Ji's 25th Anniversary", hi: "शर्मा जी की 25वीं सालगिरह" },
    hostPlaceholder: { en: "The Sharma Family", hi: "शर्मा परिवार" },
    kicker: { en: "Please join us to celebrate", hi: "इस खुशी के अवसर पर पधारें" },
    message: {
      en: "25 years of love, laughter and togetherness. Your presence would make it complete.",
      hi: "प्यार और साथ के 25 साल। आपकी उपस्थिति इस खुशी को पूरा करेगी।",
    },
    template: "classic",
    palette: "royal",
  },
  {
    id: "griha-pravesh",
    emoji: "🏡",
    name: { en: "Griha Pravesh", hi: "गृह प्रवेश" },
    blurb: "Housewarming pooja and get-together at the new home",
    titlePlaceholder: { en: "Griha Pravesh at Our New Home", hi: "हमारे नए घर का गृह प्रवेश" },
    hostPlaceholder: { en: "The Verma Family", hi: "वर्मा परिवार" },
    kicker: { en: "With the blessings of the Almighty", hi: "ईश्वर की कृपा से" },
    message: {
      en: "We are moving into our new home and would love for you to bless it with your presence.",
      hi: "हम अपने नए घर में प्रवेश कर रहे हैं। कृपया पधारकर हमें आशीर्वाद दें।",
    },
    template: "shubh",
    palette: "maroon",
  },
  {
    id: "baby-shower",
    emoji: "🍼",
    name: { en: "Baby Shower", hi: "गोद भराई" },
    blurb: "Godh bharai, baby showers and naming ceremonies",
    titlePlaceholder: { en: "Priya's Godh Bharai", hi: "प्रिया की गोद भराई" },
    hostPlaceholder: { en: "The Gupta Family", hi: "गुप्ता परिवार" },
    kicker: { en: "A little one is on the way!", hi: "नन्हा मेहमान आने वाला है!" },
    message: {
      en: "Come shower the mom-to-be with love and blessings.",
      hi: "होने वाली माँ को अपना प्यार और आशीर्वाद देने ज़रूर आइए।",
    },
    template: "confetti",
    palette: "sky",
  },
  {
    id: "pooja",
    emoji: "🪔",
    name: { en: "Pooja & Kirtan", hi: "पूजा और कीर्तन" },
    blurb: "Satyanarayan katha, jagran, kirtan, havan",
    titlePlaceholder: { en: "Satyanarayan Katha", hi: "श्री सत्यनारायण कथा" },
    hostPlaceholder: { en: "The Agarwal Family", hi: "अग्रवाल परिवार" },
    kicker: { en: "You are cordially invited to", hi: "आप सपरिवार सादर आमंत्रित हैं" },
    message: {
      en: "Kindly join us for the pooja, followed by prasad and lunch.",
      hi: "पूजा के पश्चात प्रसाद एवं भोजन की व्यवस्था है।",
    },
    template: "shubh",
    palette: "marigold",
  },
  {
    id: "party",
    emoji: "🎉",
    name: { en: "Party & Get-together", hi: "पार्टी और मिलन" },
    blurb: "Farewells, kitty parties, reunions, Diwali parties",
    titlePlaceholder: { en: "Diwali Get-together", hi: "दिवाली मिलन समारोह" },
    hostPlaceholder: { en: "Ankit & Friends", hi: "अंकित और दोस्त" },
    kicker: { en: "Let's celebrate together", hi: "आइए साथ मिलकर जश्न मनाएँ" },
    message: {
      en: "Good food, music and even better company. Don't miss it!",
      hi: "बढ़िया खाना, संगीत और अपनों का साथ। ज़रूर आइए!",
    },
    template: "confetti",
    palette: "peacock",
  },
] as const satisfies readonly Occasion[];

export type OccasionId = (typeof OCCASIONS)[number]["id"];
export const OCCASION_IDS = OCCASIONS.map((o) => o.id) as [OccasionId, ...OccasionId[]];

export function getOccasion(id: string): Occasion | undefined {
  return OCCASIONS.find((o) => o.id === id);
}
