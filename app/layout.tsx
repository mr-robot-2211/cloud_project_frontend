import { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Cloud Project Frontend",
  description: "Frontend for cloud microservices project",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: 16, borderBottom: "1px solid #ddd" }}>
          <nav>
            <Link href="/">Home</Link> |{" "}
            <Link href="/login">Login</Link> |{" "}
            <Link href="/courses">Courses</Link> |{" "}
            <Link href="/recommendations">Recommendations</Link> |{" "}
            <Link href="/enroll">Enrollments</Link>
          </nav>
        </header>
        <main style={{ padding: 20 }}>{children}</main>
      </body>
    </html>
  );
}
