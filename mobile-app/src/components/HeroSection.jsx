import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme';

const BANNERS = [
  'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770635561/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1920_x_500_px_1_l8iyri.png',
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771338484/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1_shojp0.png',
];

export default function HeroSection() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (BANNERS.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % BANNERS.length), 4000);
    return () => clearInterval(id);
  }, []);

  const { width } = Dimensions.get('window');
  return (
    <View style={styles.container}>
      <Image source={{ uri: BANNERS[idx] }} style={[styles.img, { width }]} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: colors.black },
  img: { height: 140 },
});
