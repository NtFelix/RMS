"use client";

import { useState } from "react";
import { GlobalAIChatButton } from "./global-ai-chat-button";
import { GlobalAIChatSidebar } from "./global-ai-chat-sidebar";

export function GlobalAIChat() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <GlobalAIChatSidebar isOpen={isOpen} onClose={closeSidebar} />
      <GlobalAIChatButton isOpen={isOpen} onClick={toggleSidebar} />
    </>
  );
}
