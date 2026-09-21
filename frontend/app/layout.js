import './globals.css';
export const metadata = {
  title: 'TableTrail | Restaurant workspace',
  description:
    'Track every order. Understand every customer. Run every branch smarter.',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
