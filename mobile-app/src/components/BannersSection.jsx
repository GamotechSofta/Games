import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme';

const BANNERS = [
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771503014/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1080_x_547_px_1_ooz3sj.png',
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771501969/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1080_x_547_px_npbht7.png',
];

// Match frontend mobile: mt-2, shadow-[0_10px_25px_rgba(0,0,0,0.35)], h-[180px], gradient overlay from-black/25 bottom
export default function BannersSection() {
  const [bannerIdx, setBannerIdx] = useState(0);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (BANNERS.length <= 1) return;
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={[styles.carousel, { width }]}>
        <View style={[styles.slider, { width: width * BANNERS.length, transform: [{ translateX: -bannerIdx * width }] }]}>
          {BANNERS.map((uri, i) => (
            <Image key={i} source={{ uri }} style={[styles.slide, { width }]} resizeMode="cover" />
          ))}
        </View>
        <View style={styles.overlay} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  carousel: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 8,
  },
  slider: { flexDirection: 'row' },
  slide: { height: 180 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
