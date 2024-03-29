import React, { useEffect } from "react";
import type { NextPage } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

const Home: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push("/login");
    } else {
      router.push("/board");
    }
  }, [session]);

  return <p>Loading...</p>;
};

export default Home;
