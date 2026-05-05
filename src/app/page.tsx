"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.role === "colaborador") {
        router.push("/colaborador");
      } else {
        router.push("/gestor");
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-xl overflow-hidden animate-pulse">
        <Image
          src="/icons/icon-192.png"
          alt="Doptex Skills"
          width={48}
          height={48}
          priority
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
