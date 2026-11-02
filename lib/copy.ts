// All user-facing strings live here so Hinglish / i18n can be added later (CLAUDE.md).
import { APP_NAME, APP_TAGLINE } from './config';

export const copy = {
  app: { name: APP_NAME, tagline: APP_TAGLINE },
  login: {
    title: APP_NAME,
    tagline: APP_TAGLINE,
    headline: APP_TAGLINE,
    pitch: 'Restaurant and street-food verdicts from people you know, not strangers.',
    google: 'Continue with Google',
    privacy:
      'We only use your name and photo from Google. You choose who sees each entry before you post it.',
    error: 'Sign-in did not finish. Please try again.',
    providerOff: 'Google sign-in is not set up on this server yet. Please try again later.',
  },
  onboarding: {
    title: 'Set up your profile',
    intro: 'Takes a minute. Only your username and name are required.',
    submit: "Let's eat",
    saving: 'Saving…',
  },
  home: {
    title: 'Home',
    emptyTitle: "Your friends' picks will show up here.",
    emptyBody: 'Friends, following and the log button arrive in the next phase.',
    signedInAs: (name: string) => `Signed in as ${name}`,
  },
  nav: {
    home: 'Home',
    discover: 'Discover',
    log: 'Log a place',
    diary: 'Diary',
    me: 'Me',
  },
  auth: { signOut: 'Sign out' },
  footer: {
    osm: '© OpenStreetMap contributors',
    privacy: 'Your entries are only visible to the people you choose.',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    retry: 'Try again',
  },
} as const;
