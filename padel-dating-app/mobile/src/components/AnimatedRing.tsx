/**
 * AnimatedRing — clean animated circular ring with glow effect
 *
 * Draws clockwise from the bottom (6 o'clock position), completing a full circle.
 * Glow pulses during the draw then settles.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

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
  duration = 2200,
  children,
}: Props) {
  const half = size / 2;
  const innerSize = size - thickness * 2;

  const progress = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    glow.setValue(0);

    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: duration * 0.5,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.35,
          duration: duration * 0.5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []); // runs once on mount — parent remounts with key prop to re-trigger

  // Right half: sweeps from bottom-right to top (first 50%)
  const rotateRight = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '180deg'],
  });

  // Left half: sweeps from top to bottom-left (second 50%)
  const rotateLeft = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '0deg', '180deg'],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>

      {/* Glow halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          top: -8,
          left: -8,
          backgroundColor: color,
          opacity: Animated.multiply(glow, 0.2),
        }}
      />

      {/* Faint track ring */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: half,
        borderWidth: thickness,
        borderColor: 'rgba(255,255,255,0.06)',
      }} />

      {/* RIGHT half mask — reveals bottom→top clockwise */}
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
          // Start at 6 o'clock: rotate -90° to position, then animate
          transform: [
            { translateX: half },
            { rotate: '-90deg' },
            { translateX: -half },
            { rotate: rotateRight },
          ],
        }} />
      </View>

      {/* LEFT half mask — reveals top→bottom clockwise */}
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

      {/* Avatar content */}
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
