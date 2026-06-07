import React from 'react';
import { StyleSheet, ImageBackground, View, StatusBar } from 'react-native';
import { theme } from '../lib/theme';

const BG = require('../../assets/volpair-bg-v2.png');

interface Props {
  children: React.ReactNode;
  style?: object;
}

export function ScreenBackground({ children, style }: Props) {
  return (
    <ImageBackground
      source={BG}
      style={[styles.root, style]}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg, // fallback while image loads
  },
});
