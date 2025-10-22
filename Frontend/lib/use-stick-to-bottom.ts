/**
 * useStickToBottom Hook
 *
 * Manages scroll behavior for chat containers:
 * - Detects if user is at bottom of scroll container
 * - Provides function to scroll to bottom
 * - Auto-scrolls on new content (if user was at bottom)
 */

import {
  useEffect,
  useState,
  useCallback,
  RefObject,
  MutableRefObject,
} from "react";

type ElementRef<El extends HTMLElement> =
  | RefObject<El | null>
  | MutableRefObject<El | null>;

interface UseStickToBottomProps<
  ContainerEl extends HTMLElement,
  BottomEl extends HTMLElement
> {
  scrollContainerRef: ElementRef<ContainerEl>;
  scrollBottomRef: ElementRef<BottomEl>;
  threshold?: number; // Distance from bottom (px) to consider "at bottom"
}

interface UseStickToBottomReturn {
  isAtBottom: boolean;
  scrollToBottom: () => void;
}

export function useStickToBottom<
  ContainerEl extends HTMLElement,
  BottomEl extends HTMLElement
>({
  scrollContainerRef,
  scrollBottomRef,
  threshold = 50,
}: UseStickToBottomProps<ContainerEl, BottomEl>): UseStickToBottomReturn {
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [scrollBottomRef]);

  // Check if scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    setIsAtBottom(distanceFromBottom <= threshold);
  }, [scrollContainerRef, threshold]);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Initial check
    checkIfAtBottom();

    // Listen for scroll events
    container.addEventListener("scroll", checkIfAtBottom);

    return () => {
      container.removeEventListener("scroll", checkIfAtBottom);
    };
  }, [scrollContainerRef, checkIfAtBottom]);

  // Auto-scroll on resize (e.g., keyboard opens on mobile)
  useEffect(() => {
    const handleResize = () => {
      if (isAtBottom) {
        scrollToBottom();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isAtBottom, scrollToBottom]);

  return {
    isAtBottom,
    scrollToBottom,
  };
}
