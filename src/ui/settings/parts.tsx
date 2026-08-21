import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  fontFamily,
  lineHeights,
  radius,
  spacing,
  tracking,
  typography,
  useTheme,
} from '@/ui/theme';

/**
 * The pieces every section of `/settings` is built from.
 *
 * Lifted out because six sections repeating the same heading, row and chip would be six chances for
 * one of them to keep an old spacing — the same argument `MockupScreen` makes about the safe-area
 * wrapper. It also keeps each section file about its own decisions rather than its padding.
 *
 * The vocabulary is the one the rest of OL1 already uses: a micro all-caps label over a block, a
 * hairline-separated row, and a pill for a choice. Nothing new is invented here; the previous app's
 * settings used large serif section headings, and adopting them on one screen would have made
 * Settings the only screen in OL1 that looks like somewhere else.
 */

export function Section({
  children,
  hint,
  title,
}: {
  children: ReactNode;
  hint?: string;
  title: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>{title}</Text>
      {hint !== undefined && <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>}
      {children}
    </View>
  );
}

/**
 * One line with something on the right.
 *
 * `action` is the word for what tapping does, and it is deliberately a word rather than a chevron:
 * `Bring back` and `Put away` are opposite acts on rows that otherwise look identical, and an arrow
 * would make them look like the same one.
 */
export function Row({
  action,
  indented = false,
  label,
  muted = false,
  onPress,
}: {
  action?: string;
  indented?: boolean;
  label: string;
  muted?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  const body = (
    <View style={[styles.row, indented && styles.rowIndented]}>
      <Text style={[styles.rowLabel, { color: muted ? colors.textSubtle : colors.text }]}>
        {label}
      </Text>
      {action !== undefined && (
        <Text style={[styles.rowAction, { color: onPress === undefined ? colors.textSubtle : colors.accent }]}>
          {action}
        </Text>
      )}
    </View>
  );

  if (onPress === undefined) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

/** A hairline between rows. Between them only — a rule under the last row closes a list nothing ends. */
export function Rule() {
  const { colors } = useTheme();
  return <View style={[styles.rule, { backgroundColor: colors.borderSubtle }]} />;
}

export function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: on ? colors.accentSoft : 'transparent',
          borderColor: on ? colors.accentBorder : colors.hairline,
        },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.chipText, { color: on ? colors.accent : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

export function Field({ children, label }: { children: ReactNode; label: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label}</Text>
      {children}
    </View>
  );
}

export function Note({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.note, { color: colors.textSubtle }]}>{text}</Text>;
}

export function Problem({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.problem, { color: colors.warning }]}>{text}</Text>;
}

export const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  field: { marginTop: spacing.md },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: typography.caption,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontFamily: fontFamily.body,
    fontSize: typography.body,
    paddingVertical: spacing.sm,
  },
  note: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  problem: { fontFamily: fontFamily.body, fontSize: typography.caption, marginTop: spacing.xs },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowAction: { fontFamily: fontFamily.medium, fontSize: typography.caption },
  rowIndented: { paddingLeft: spacing.md },
  rowLabel: { flexShrink: 1, fontFamily: fontFamily.body, fontSize: typography.bodySmall },
  rule: { height: StyleSheet.hairlineWidth },
  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
  },
});
