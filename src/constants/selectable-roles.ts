export const SelectableRoles: {
  category:
    | "Religion"
    | "Region"
    | "Age"
    | "Gender"
    | "Marital Status"
    | "Other Languages"
    | "Reminder Roles";
  roleNames: string[];
  allowMultiple?: boolean;
}[] = [
  {
    category: "Religion",
    roleNames: [
      "Submitter",
      "Traditional Muslim - Sunni",
      "Traditional Muslim - Shia",
      "Traditional Muslim - Other",
      "Quranist",
      "Christian",
      "Christian - Nontrinitarian",
      "Jewish",
      "Buddhist",
      "Hindu",
      "Bahai",
      "Sikh",
      "Agnostic / Atheist",
      "Undecided / Exploring",
      "Other Religion",
    ],
  },
  {
    category: "Age",
    roleNames: ["13-17", "18-24", "25-29", "30-39", "40+"],
  },
  {
    category: "Region",
    roleNames: [
      "United States",
      "Canada",
      "South America",
      "Europe",
      "Middle East",
      "Asia",
      "Africa",
      "Australia",
    ],
  },
  {
    category: "Gender",
    roleNames: ["Male", "Female"],
  },
  {
    category: "Marital Status",
    roleNames: ["Single", "Engaged", "Married"],
  },
  {
    category: "Other Languages",
    roleNames: [
      "Turkish",
      "Persian",
      "French",
      "Albanian",
      "Spanish",
      "Bengali",
      "Arabic",
      "Urdu",
      "Swedish",
      "German",
      "Bahasa",
      "Kurdish",
      "Hebrew",
      "Hausa",
      "Hindi",
      "Russian",
      "Ukranian",
      "Bosnian",
      "Tamil",
    ],
    allowMultiple: true,
  },
  {
    category: "Reminder Roles",
    roleNames: [
      "Recitation Ping",
      "Quran Study Ping",
      "Torah & Gospel Study Ping",
      "Meditation Ping",
      "VC Ping",
      "Bumper",
    ],
    allowMultiple: true,
  },
];
