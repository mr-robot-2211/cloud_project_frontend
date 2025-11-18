import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>Cloud Project Frontend</h1>
      <p>Welcome! Use the navigation above to test the microservices.</p>
      <div style={{ marginTop: 30 }}>
        <h2>Quick Links</h2>
        <ul>
          <li><Link href="/courses">Browse Courses</Link></li>
          <li><Link href="/recommendations">View Personalized Recommendations</Link></li>
          <li><Link href="/enroll">My Enrollments</Link></li>
        </ul>
      </div>
    </div>
  );
}
