"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore } from "@/lib/store";

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function RouteGuard({
  children,
  requireAuth = true,
}: RouteGuardProps) {
  const router = useRouter();
  const student = useStudentStore((state) => state.student);

  useEffect(() => {
    if (requireAuth && !student) {
      router.push("/");
    }
  }, [student, requireAuth, router]);

  if (requireAuth && !student) {
    return null;
  }

  return <>{children}</>;
}
