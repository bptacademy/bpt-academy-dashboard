/**
 * AnimatedRing — animated circular ring that draws itself around an avatar.
 *
 * Uses the "rotating half-circle" technique:
 * - Two half-circles clipped by overflow:hidden containers
 * - First half rotates 0→180° (right side fills)
 * - Second half rotates 0→180° (left side fills)
 * - Combined: full circle draws clockwise from bottom
 *
 * Pure RN Animated — no SVG, works in Expo Go.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  size: number;       // total diameter including ring
  thickness: number;  // ring stroke width
  color: string;      // ring color
  duration?: number;  // total animation ms
  children: React.ReactNode;
}

export default function AnimatedRing({ size, thickness, color, duration = 1400, children }: Props) {
  const half = size / 2;
  const innerSize = size - thickness * 2;

  const rotA = useRef(new Animated.Value(-180)).current; // right half: starts hidden
  const rotB = useRef(new Animated.Value(-180)).current; // left half: starts hidden

  useEffect(() => {
    rotA.setValue(-180);
    rotB.setValue(-180);

    Animated.sequence([
      // First half: draw right side (bottom → top clockwise)
      Animated.timing(rotA, {
        toValue: 0,
        duration: duration / 2,
        useNativeDriver: true,
      }),
      // Second half: draw left side (top → bottom clockwise)
      Animated.timing(rotB, {
        toValue: 0,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ]).start();
  }, [color]);

  const rotateA = rotA.interpolate({
    inputRange: [-180, 0],
    outputRange: ['-180deg', '0deg'],
  });

  const rotateB = rotB.interpolate({
    inputRange: [-180, 0],
    outputRange: ['-180deg', '0deg'],
  });

  return (
    <View style={{ width: size, height: size }}>
      {/* Faint background ring */}
      <View style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: half,
          borderWidth: thickness,
          borderColor: 'rgba(255,255,255,0.07)',
        },
      ]} />

      {/* RIGHT half — clip to right 50% of circle */}
      <View style={{
        position: 'absolute', top: 0, right: 0,
        width: half, height: size,
        overflow: 'hidden',
      }}>
        {/* Full-size ring that rotates behind the clip */}
        <Animated.View style={{
          position: 'absolute',
          top: 0, left: -half,
          width: size, height: size,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: color,
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [
            { translateX: half },
            { rotate: '-135deg' }, // start from bottom (270° = -90°, but offset -45° to start at 6 o'clock)
            { translateX: -half },
            { rotate: rotateA },
          ],
        }} />
      </View>

      {/* LEFT half — clip to left 50% of circle */}
      <View style={{
        position: 'absolute', top: 0, left: 0,
        width: half, height: size,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          position: 'absolute',
          top: 0, left: 0,
          width: size, height: size,
          borderRadius: half,
          borderWidth: thickness,
          borderColor: color,
          borderRightColor: 'transparent',
          borderTopColor: 'transparent',
          transform: [
            { translateX: -half },
            { rotate: '45deg' },
            { translateX: half },
            { rotate: rotateB },
          ],
        }} />
      </View>

      {/* Avatar content centered inside the ring */}
      <View style={{
        position: 'absolute',
        top: thickness,
        left: thickness,
        width: innerSize,
        height: innerSize,
        borderRadius: innerSize / 2,
        overflow: 'hidden',
        backgroundColor: 'transparent',
      }}>
        {children}
      </View>
    </View>
  );
}
