/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_TALLY_FEEDBACK_FORM_ID?: string;
}

declare const __APP_VERSION__: string;
