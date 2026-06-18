import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSkillsScore } from '../../hooks/useSkillsScore';

// Compact "Your level" card showing the coach-assessed level score (1–7) with a
// progress bar toward the next-level target. Used on Profile + Home.
export default function LevelScoreCard({ onPress }: { onPress?: () => void }) {
  const { score, loading } = useSkillsScore();
  if (loading || !score) return null;

  const { avg, target, minPass, label, assessedCount } = score;
  const assessed = assessedCount > 0 && avg !== null;
  const pct = avg !== null ? Math.min(100, Math.round((avg / 7) * 100)) : 0;
  const targetPct = Math.min(100, Math.round((target / 7) * 100));
  const col = !assessed ? '#7A8FA6'
    : avg! >= target ? '#16A34A'
    : avg! >= minPass ? '#FBBF24' : '#EF4444';

  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>YOUR LEVEL</Text>
        <Text style={styles.levelLabel}>{label}</Text>
      </View>

      {assessed ? (
        <>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: col }]}>{avg!.toFixed(1)}</Text>
            <Text style={styles.target}> / {target.toFixed(1)} to promote</Text>
            {avg! >= target && <Text style={styles.ready}>  ✓ ready</Text>}
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: col }]} />
            <View style={[styles.marker, { left: `${targetPct}%` }]} />
          </View>
          <Text style={styles.hint}>Average of your coach skill assessments (1–7){onPress ? ' · tap for details' : ''}</Text>
        </>
      ) : (
        <Text style={styles.notAssessed}>Not yet assessed — your coach will score your skills soon.</Text>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  kicker: { fontSize: 11, fontWeight: '700', color: '#7A8FA6', letterSpacing: 1 },
  levelLabel: { fontSize: 14, fontWeight: '800', color: '#F0F6FC' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  score: { fontSize: 30, fontWeight: '900' },
  target: { fontSize: 13, color: '#7A8FA6', fontWeight: '600' },
  ready: { fontSize: 13, color: '#16A34A', fontWeight: '800' },
  barBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 4, overflow: 'visible', justifyContent: 'center' },
  barFill: { height: 8, borderRadius: 4 },
  marker: { position: 'absolute', width: 2, height: 14, backgroundColor: '#FFFFFF', opacity: 0.7, borderRadius: 1 },
  hint: { fontSize: 11, color: '#7A8FA6', marginTop: 8 },
  notAssessed: { fontSize: 13, color: '#7A8FA6', lineHeight: 18 },
});
