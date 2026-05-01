/**
 * AnimatedRing — clean animated circular ring with glow effect
 *
 * Uses the rotating half-mask technique correctly:
 * - A full ring border is revealed by rotating two half-circle masks
 * - A glow pulse animates simultaneously for the "charging" feel
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  size: number;
  thickness: number;
  color: string;
  duration?: number;
  children: React.ReactNode;
}

export default function AnimatedRing({
  size,
  thickness,
  color,
  duration = 1400,
  children,
}: Props) {
  const half = size / 2;
  const innerSize = size - thickness * 2;

  // Progress: 0 → 1 over full duration
  const progress = useRef(new Animated.Value(0)).current;
  // Glow pulse
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    glow.setValue(0);

    Animated.parallel([
      // Draw the ring
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      // Glow: fade in during draw, then settle
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: duration * 0.6,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: duration * 0.4,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [color]);

  // First half rotates 0→180° (covers right side)
  const rotateRight = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '180deg'],
  });

  // Second half rotates 0→180° but only starts at 50% progress
  const rotateLeft = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '0deg', '180deg'],
  });

  const glowOpacity = glow;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>

      {/* Glow halo behind the ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 12,
          height: size + 12,
          borderRadius: (size + 12) / 2,
          backgroundColor: color,
          opacity: Animated.multiply(glowOpacity, 0.25),
          top: -6,
          left: -6,
        }}
      />

      {/* Base ring (faint track) */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: half,
        borderWidth: thickness,
        borderColor: 'rgba(255,255,255,0.06)',
      }} />

      {/* RIGHT half — reveals first 180° */}
      <View style={{
        position: 'absolute',
        width: half,
        height: size,
        right: 0,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          position: 'absolute',
          width: size,
          height: size,
          right: 0,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: color,
          borderLeftColor: 'transparent',
          borderTopColor: 'transparent',
          transform: [
            { translateX: half },
            { rotate: '-90deg' },
            { translateX: -half },
            { rotate: rotateRight },
          ],
        }} />
      </View>

      {/* LEFT half — reveals second 180° */}
      <View style={{
        position: 'absolute',
        width: half,
        height: size,
        left: 0,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          position: 'absolute',
          width: size,
          height: size,
          left: 0,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: color,
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [
            { translateX: -half },
            { rotate: '90deg' },
            { translateX: half },
            { rotate: rotateLeft },
          ],
        }} />
      </View>

      {/* Inner content */}
      <View style={{
        width: innerSize,
        height: innerSize,
        borderRadius: innerSize / 2,
        overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}
