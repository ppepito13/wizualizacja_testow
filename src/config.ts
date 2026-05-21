// Konfiguracja bazy danych online
// Adres URL udostępnionego arkusza Google Sheets pobierany ze zmiennej środowiskowej.
// Dla bezpiecznego wdrożenia, ustaw klucz VITE_GOOGLE_SHEET_URL w pliku .env (lub w panelu Secrets w AI Studio).
export const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || "PLACEHOLDER_FOR_YOUR_SECRET_GOOGLE_SHEET_URL";
