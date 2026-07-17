import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

export interface IconSymbolProps {
  name: 'house.fill' | 'paperplane.fill' | string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}

export declare function IconSymbol(props: IconSymbolProps): React.JSX.Element;
