/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_TALLY_FEEDBACK_FORM_ID?: string;
  /** Optional full URL for ZET app deep link (defaults: prod api.zet.hr, dev uat-api.zet.hr). */
  readonly VITE_ZET_APP_DEEP_LINK_URL?: string;
}

declare const __APP_VERSION__: string;
