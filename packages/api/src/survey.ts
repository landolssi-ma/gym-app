// The onboarding survey: one question per step, answers stored on the workspace. Add or change
// questions here only; the survey page and the API both read this list. Labels are en.json keys.
export type SurveyQuestion = { id: string; label: string; required: boolean; options: { value: string; label: string }[] }

export const SURVEY = [
  {
    id: "role",
    label: "survey.role",
    required: true,
    options: [
      { value: "founder", label: "survey.roleFounder" },
      { value: "developer", label: "survey.roleDeveloper" },
      { value: "marketer", label: "survey.roleMarketer" },
      { value: "other", label: "survey.other" },
    ],
  },
  {
    id: "teamSize",
    label: "survey.teamSize",
    required: true,
    options: [
      { value: "1", label: "survey.teamJustMe" },
      { value: "2_10", label: "survey.team2to10" },
      { value: "11_50", label: "survey.team11to50" },
      { value: "51_plus", label: "survey.team51plus" },
    ],
  },
  {
    id: "source",
    label: "survey.source",
    required: false,
    options: [
      { value: "google", label: "survey.sourceGoogle" },
      { value: "social", label: "survey.sourceSocial" },
      { value: "referral", label: "survey.sourceReferral" },
      { value: "other", label: "survey.other" },
    ],
  },
] satisfies SurveyQuestion[]

export type Onboarding = { answers: Record<string, string>; completedAt?: string }

// A known question and one of its options, or null.
export const validAnswer = (id: string, value: string) => SURVEY.some((q) => q.id === id && q.options.some((o) => o.value === value))
export const missingRequired = (answers: Record<string, string>) => SURVEY.filter((q) => q.required && !answers[q.id]).map((q) => q.id)
