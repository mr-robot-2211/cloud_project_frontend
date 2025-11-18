"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

export default function EnrollPage() {
  const [enrolls, setEnrolls] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get(`${process.env.NEXT_PUBLIC_ENROLL_SERVICE}/my-enrollments`)
      .then((res) => setEnrolls(res.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2>My Enrollments</h2>
      <ul>
        {enrolls.map((e) => (
          <li key={e.course_id}>{e.course_title || `Course ${e.course_id}`}</li>
        ))}
      </ul>
    </div>
  );
}
