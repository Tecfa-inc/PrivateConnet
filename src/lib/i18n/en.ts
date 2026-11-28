/**
 * Member-app wording (NFR-13: all wording in one place, English first, ready for translation).
 * Neutral, plain and short. Never put a member's number here.
 */
export const en = {
  support: {
    line: "WhatsApp or call",
    contact: "Contact PrivateConnet",
  },
  signIn: {
    welcome: (name: string) => `Welcome, ${name}`,
    intro: "Your PrivateConnet membership is ready. To keep your account safe, confirm your date of birth.",
    dobLegend: "Date of birth",
    day: "Day",
    month: "Month",
    year: "Year",
    linkNote: (expires: string) => `This link works once and expires on ${expires}. After this, this phone stays signed in.`,
    continue: "Continue",
    notMe: (name: string) => `Not ${name}?`,
    tellUs: "Tell PrivateConnet",
    wrongDate: (left: number) =>
      `That date doesn't match our records. ${left} ${left === 1 ? "try" : "tries"} left before this link locks for 15 minutes.`,
    badDate: "Enter a real date: day, month and a 4-digit year.",
  },
  linkProblem: {
    used: {
      title: "This link has already been used",
      body: "Sign-in links work once, for 72 hours. If you didn't use it, or you're on a new phone, contact PrivateConnet. We'll call your registered number before sending a new one.",
    },
    expired: {
      title: "This link has expired",
      body: "Sign-in links work for 72 hours. Contact PrivateConnet and we'll call your registered number before sending a new one.",
    },
    revoked: {
      title: "This link no longer works",
      body: "It has been replaced or cancelled. Contact PrivateConnet if you need a new one.",
    },
    locked: {
      title: "Too many tries",
      body: "For your safety this link is locked for 15 minutes. Try again later, or contact PrivateConnet.",
    },
    invalid: {
      title: "We don't recognise this link",
      body: "Check that you opened the whole link. If it still doesn't work, contact PrivateConnet.",
    },
  },
  onboarding: {
    step: (n: number) => `Step ${n} of 3`,
    notVisible: "Not visible to anyone yet",
    checkTitle: "Check your profile",
    noMorePhotos: "No more photos",
    addPhotos: "Add photos",
    phoneRow: "Only after you connect",
    requestChange: "Something wrong? Request a change",
    acceptTerms: "I accept the terms and privacy notice, including that my data is stored on a server outside Liberia.",
    publish: "Publish my profile",
    mustAccept: "Tick the box to accept the terms and privacy notice.",
    pinTitle: "Add a PIN for this phone?",
    pinBody: "Useful if other people use your phone. You'll enter it each time you open PrivateConnet.",
    savePin: "Save PIN",
    skip: "Skip for now",
  },
  fields: {
    displayName: "Display name",
    age: "Age shown",
    city: "City",
    lookingFor: "Looking for",
    gender: "Gender",
    occupation: "Occupation",
    bio: "About you",
    interests: "Interests",
    phone: "Phone",
    shown: "shown",
    hidden: "hidden",
  },
  lookingFor: { RELATIONSHIP: "Relationship", FRIENDSHIP: "Friendship", EITHER: "Relationship or friendship" },
  gender: { WOMAN: "Woman", MAN: "Man", OTHER: "Other" },
  review: {
    pendingEdit: "Your changes are waiting for review. Members see your current profile until then.",
    pendingPhoto: "Waiting for review",
    submitted: "Thanks. Your changes are waiting for review.",
    submittedFlagged:
      "Thanks. Your changes are waiting for review. Remember: phone numbers, links and prices can't appear on profiles.",
    noChange: "Nothing changed.",
  },
  pin: {
    unlockTitle: "Enter your PIN",
    unlockBody: "This phone is protected with a PIN.",
    pinLabel: "4-digit PIN",
    confirmLabel: "Enter it again",
    unlock: "Unlock",
    wrong: (left: number) => `That PIN isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`,
    locked: "Too many tries. PrivateConnet is locked on this phone for 15 minutes.",
    forgot: "Forgot your PIN? Contact PrivateConnet. We'll call your registered number and send a new sign-in link.",
  },
  settings: {
    title: "Settings",
    pinSection: "App PIN",
    pinOn: "A PIN is set for this phone.",
    pinOff: "No PIN on this phone.",
    changePin: "Change PIN",
    removePin: "Remove PIN",
    setPin: "Set a PIN",
    devicesSection: "Signed-in phones and browsers",
    devicesBody: "Lost your phone? Sign out everywhere. You'll need a new sign-in link from PrivateConnet afterwards.",
    signOutAll: "Sign out of all devices",
  },
  signedOut: {
    title: "You're signed out",
    body: "To sign in again, contact PrivateConnet. We'll call your registered number and send you a new sign-in link.",
  },
  paused: {
    title: "Your account is paused",
    body: "Your profile is hidden while our team looks into something. Contact PrivateConnet if you have questions.",
  },
} as const;
