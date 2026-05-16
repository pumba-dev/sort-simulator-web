import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

export const useViewportBreakpoint = (maxWidth: number): Ref<boolean> => {
  const isBelow = ref(
    typeof window !== "undefined" && window.innerWidth <= maxWidth,
  );

  const update = (): void => {
    if (typeof window === "undefined") {
      return;
    }
    isBelow.value = window.innerWidth <= maxWidth;
  };

  onMounted(() => {
    update();
    window.addEventListener("resize", update);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", update);
  });

  return isBelow;
};
