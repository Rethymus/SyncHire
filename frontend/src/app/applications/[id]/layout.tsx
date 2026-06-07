export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "app-seed-1" }];
}

export default function ApplicationIdLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
