/**
 * Composable that provides AAA-compatible color tokens for both light and dark modes.
 * Use these instead of repeating `$q.dark.isActive ? ... : ...` inline.
 */
import { computed } from 'vue';
import { useQuasar } from 'quasar';

export function useDarkColors() {
  const $q = useQuasar();
  const dark = computed(() => $q.dark.isActive);

  /** Quasar color token: primary text — AAA compliant */
  const primaryColor = computed(() => dark.value ? 'primary-300' : 'primary');

  /** Quasar color token: secondary/teal — AAA compliant */
  const secondaryColor = computed(() => dark.value ? 'teal-3' : 'secondary');

  /** Quasar color token: destructive/negative — AAA compliant */
  const negativeColor = computed(() => dark.value ? 'red-3' : 'negative');

  /** Quasar color token for muted labels */
  const mutedColor = computed(() => dark.value ? 'grey-4' : 'grey-8');

  /** Quasar color token for very subtle placeholder text */
  const subtleColor = computed(() => dark.value ? 'grey-5' : 'grey-7');

  /** CSS class: primary text */
  const primaryTextClass = computed(() => dark.value ? 'text-primary-300' : 'text-primary');

  /** CSS class: secondary text */
  const secondaryTextClass = computed(() => dark.value ? 'text-teal-3' : 'secondary');

  /** CSS class: muted body text */
  const mutedTextClass = computed(() => dark.value ? 'text-grey-4' : 'text-grey-8');

  /** CSS class: subtle caption text */
  const subtleTextClass = computed(() => dark.value ? 'text-grey-5' : 'text-grey-7');

  /** CSS class: card surface */
  const cardBgClass = computed(() => dark.value ? 'bg-grey-10' : 'bg-white');

  /** CSS class: header row background */
  const headerRowClass = computed(() => dark.value ? 'bg-grey-10 border-grey-9' : 'bg-grey-1 border-grey-3');

  /** CSS class: table cell border */
  const cellBorderClass = computed(() => dark.value ? 'border-grey-9' : 'border-grey-3');

  return {
    dark,
    primaryColor,
    secondaryColor,
    negativeColor,
    mutedColor,
    subtleColor,
    primaryTextClass,
    secondaryTextClass,
    mutedTextClass,
    subtleTextClass,
    cardBgClass,
    headerRowClass,
    cellBorderClass,
  };
}
