import AuthProvider from "./components/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "MediVoice AI - Hospital Voice Receptionist & Patient Care",
  description: "Hospital voice receptionist with secure patient portal and appointment booking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
