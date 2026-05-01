/**
 * AnimatedRing — segmented dot ring that animates clockwise from bottom
 *
 * Uses N small dots positioned around a circle, each fading in sequentially.
 * Bulletproof in Expo Go — no SVG, no border clipping, pure RN.
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

const SEGMENTS = 36; // number of dots around the circle

export default function AnimatedRing({
  size,
  thickness,
  color,
  duration = 2000,
  children,
}: Props) {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const dotSize = thickness * 1.1;

  // One animated value per segment
  const anims = useRef(
    Array.from({ length: SEGMENTS }, () => new Animated.Value(0))
  ).current;

  // Glow
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset all
    anims.forEach(a => a.setValue(0));
    glow.setValue(0);

    const delay = duration / SEGMENTS;

    // Stagger each dot fading in
    const dotAnimations = anims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: delay * 2,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow pulse
    const glowAnim = Animated.sequence([
      Animated.timing(glow, {
        toValue: 1,
        duration: duration * 0.6,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 0.3,
        duration: duration * 0.4,
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([
      Animated.stagger(0, dotAnimations),
      glowAnim,
    ]).start();
  }, []);

  // Position each dot around the circle
  // Start at bottom (90° in standard math = 6 o'clock), go clockwise
  const dots = anims.map((anim, i) => {
    // Map segment index to angle, starting from bottom (270° in CSS = -90° in math)
    const angleDeg = (i / SEGMENTS) * 360 - 90; // -90 = top, adjust start
    const startOffset = 90; // start from bottom (add 90° to start at 6 o'clock)
    const angle = ((angleDeg + startOffset) * Math.PI) / 180;

    const x = center + radius * Math.cos(angle) - dotSize / 2;
    const y = center + radius * Math.sin(angle) - dotSize / 2;

    return (
      <Animated.View
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          opacity: anim,
        }}
      />
    );
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 20,
          height: size + 20,
          borderRadius: (size + 20) / 2,
          top: -10,
          left: -10,
          backgroundColor: color,
          opacity: Animated.multiply(glow, 0.18),
        }}
      />

      {/* Faint track */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
      }} />

      {/* Animated dots */}
      {dots}

      {/* Avatar content */}
      <View style={{
        position: 'absolute',
        width: size - thickness * 2 - 4,
        height: size - thickness * 2 - 4,
        borderRadius: (size - thickness * 2 - 4) / 2,
        overflow: 'hidden',
        top: thickness + 2,
        left: thickness + 2,
      }}>
        {children}
      </View>
    </View>
  );
}
