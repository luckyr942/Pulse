import React from 'react';
import { Ionicons } from '@expo/vector-icons';

// This maps the specific names your Tabs layout uses to valid Ionicons
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'paper-plane',
};

export function IconSymbol({ name, size = 24, color, style }) {
  // If a name isn't found in the map, it defaults to a question mark
  const iconName = MAPPING[name] || 'help-circle'; 
  
  return <Ionicons name={iconName} size={size} color={color} style={style} />;
}