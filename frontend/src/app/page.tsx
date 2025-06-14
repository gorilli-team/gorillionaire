"use client";

import { useState } from "react";
import Main from "./components/main/index";

export default function AppLayout() {
  const [selectedPage, setSelectedPage] = useState("Signals");

  return (
    <div>
      <Main selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
    </div>
  );
}
