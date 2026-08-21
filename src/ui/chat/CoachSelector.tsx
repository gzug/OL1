import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MAX_COACHES_PER_CONVERSATION } from '@/application/chat/threads';
import { hubCoaches, nestedCoachGroups } from '@/ui/chat/coachList';
import type { Coach } from '@/ui/hubs/catalog';
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
 * Who is at the table.
 *
 * The list comes from `coachList.ts`, which derives it from the hub catalog. Nothing here holds a
 * list of coaches, because a second one would drift the first time somebody adds a hub — and adding
 * a hub is now something the user can do.
 */

export function CoachSelector({
  onClose,
  onToggle,
  selected,
}: {
  onClose: () => void;
  onToggle: (coachId: string) => void;
  selected: readonly string[];
}) {
  const { colors } = useTheme();
  const full = selected.length >= MAX_COACHES_PER_CONVERSATION;

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSubtle }]}>WHO SHOULD BE AT THE TABLE</Text>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={[styles.closeText, { color: colors.textMuted }]}>Done</Text>
        </Pressable>
      </View>

      <Text style={[styles.hint, { color: colors.textSubtle }]}>
        {selected.length === 0
          ? 'With nobody picked you get the general assistant — ask it anything.'
          : `${selected.length} of ${MAX_COACHES_PER_CONVERSATION} picked.${
              full ? ' That is the most that can sit at one table.' : ''
            }`}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {hubCoaches().map((coach, index) => (
          <Row
            coach={coach}
            first={index === 0}
            key={coach.id}
            onToggle={onToggle}
            selected={selected.includes(coach.id)}
            unavailable={full && !selected.includes(coach.id)}
          />
        ))}

        {/* One heading per parent hub, rather than the single "INSIDE ACTIVITY" this printed until
            2026-08-19. Two hubs hold others now — Exercise holds the sports, Health record holds
            Labs — and a user can nest a hub they create, so the headings are derived rather than
            written. The parent's full label is used here, not its `ringLabel`: this is a list with
            room, and "INSIDE MEDICAL" would lose the word that makes it clear. */}
        {nestedCoachGroups().map((group) => (
          <Fragment key={group.parent.id}>
            <Text style={[styles.group, { color: colors.textSubtle }]}>
              {`INSIDE ${group.parent.label.toUpperCase()}`}
            </Text>
            {group.coaches.map((coach, index) => (
              <Row
                coach={coach}
                first={index === 0}
                key={coach.id}
                onToggle={onToggle}
                selected={selected.includes(coach.id)}
                unavailable={full && !selected.includes(coach.id)}
              />
            ))}
          </Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

function Row({
  coach,
  first,
  onToggle,
  selected,
  unavailable,
}: {
  coach: Coach;
  first: boolean;
  onToggle: (coachId: string) => void;
  selected: boolean;
  unavailable: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: unavailable }}
      onPress={() => onToggle(coach.id)}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopColor: colors.borderSubtle, borderTopWidth: StyleSheet.hairlineWidth },
        pressed && styles.pressed,
      ]}>
      {/* Filled when chosen, an outline when not. The one saturated thing in the sheet. */}
      <View
        style={[
          styles.mark,
          selected
            ? { backgroundColor: colors.accent, borderColor: colors.accent }
            : { borderColor: unavailable ? colors.borderSubtle : colors.hairline },
        ]}
      />
      <View style={styles.rowText}>
        <Text
          style={[
            styles.name,
            { color: unavailable ? colors.textSubtle : colors.text },
          ]}>
          {coach.name}
        </Text>
        <Text numberOfLines={1} style={[styles.focus, { color: colors.textSubtle }]}>
          {coach.focus}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  close: {
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  closeText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.caption,
  },
  focus: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    marginTop: 1,
  },
  group: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: typography.micro,
    lineHeight: lineHeights.caption,
    marginTop: spacing.xs,
  },
  list: {
    marginTop: spacing.sm,
  },
  mark: {
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    marginRight: spacing.md,
    width: 18,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodySmall,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    /**
     * A number, not a percentage. The sheet's parent is absolutely positioned with no height of its
     * own, and a percentage maxHeight against an auto-height parent resolves to nothing — the sheet
     * grew to its full content and pushed the bar off the bottom of the frame.
     *
     * The value is chosen so INSIDE ACTIVITY peeks over the fold. At 430 the sheet ended cleanly
     * after Sleep Coach and read as the whole list, which hid Exercise's coaches per sport
     * completely — a scroll nobody can see is a scroll nobody makes.
     */
    maxHeight: 470,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: typography.micro,
    letterSpacing: tracking.wide,
  },
});
