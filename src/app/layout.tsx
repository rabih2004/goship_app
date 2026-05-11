// Pass-through root layout. The real <html>/<body> live in [locale]/layout.tsx
// so we can set lang and dir based on the active locale.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
