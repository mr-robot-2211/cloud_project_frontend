"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import Link from "next/link";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get(`${process.env.NEXT_PUBLIC_COURSE_SERVICE}/api/courses/`)
      .then((res) => setCourses(res.data))
      .catch(() => alert("Failed to fetch courses"));
  }, []);

  return (
    <div>
      <h2>Courses</h2>
      {courses.map((c) => (
        <div key={c.id} style={{ marginBottom: 10 }}>
          <h3>
            <Link href={`/courses/${c.id}`}>{c.title}</Link>
          </h3>
          <p>{c.description}</p>
        </div>
      ))}
    </div>
  );
}
