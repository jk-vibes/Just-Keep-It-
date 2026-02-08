
/**
 * Triggers a light haptic feedback if supported by the device.
 * Used to enhance the tactile feel of button interactions.
 */
export const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors (e.g. if blocked by browser policy)
    }
  }
};
