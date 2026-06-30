import { useEffect, useRef } from "react";

export function useDismissOnOutsidePointer<T extends HTMLElement>(isActive: boolean, onDismiss: () => void) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node) || containerRef.current?.contains(target)) {
        return;
      }

      onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, onDismiss]);

  return containerRef;
}
