import "@testing-library/jest-dom";

// Env vars required by modules at load time
process.env.SUPABASE_URL = "http://test.supabase.co";
process.env.SUPABASE_SECRET_KEY = "test-secret-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
process.env.NEXTAUTH_SECRET = "test-nextauth-secret";

// Mock Web Speech API so VoiceButton renders its main UI (not the fallback).
// Tests configure the return value via mockImplementation in beforeEach.
if (typeof window !== "undefined") {
  window.SpeechRecognition = jest.fn();
}
