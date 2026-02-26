import React, { useState, useEffect, useRef, memo } from 'react';
import { View, StyleSheet, PanResponder, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

const BANNER_HEIGHT = 180;

// Same 3 banners as frontend (all PNG for RN). Order: Black Gold, Black Orange, Minimalist.
const BANNERS = [
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771503014/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1080_x_547_px_1_ooz3sj.png',
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771501969/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1080_x_547_px_npbht7.png',
  'https://res.cloudinary.com/dnyp5jknp/image/upload/w_1080,h_547,f_png,c_fill/v1771873663/Black_and_White_Minimalist_Casino_Night_Facebook_Cover_5839_x_3402_px_thbbms',
];

// Frontend mobile: mt-2, h-[180px] object-cover, shadow, gradient overlay, swipe + auto 4s, dot indicators
function BannersSection() {
  const [bannerIdx, setBannerIdx] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const { width: winWidth } = useWindowDimensions();
  const width = Math.max(winWidth || 320, 320);

  useEffect(() => {
    if (BANNERS.length <= 1) return;
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000);
    return () => clearInterval(id);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (_, evt) => {
        const x = evt?.nativeEvent?.pageX ?? 0;
        touchStartX.current = x;
        touchEndX.current = x;
      },
      onPanResponderMove: (_, evt) => {
        const x = evt?.nativeEvent?.pageX;
        if (typeof x === 'number') touchEndX.current = x;
      },
      onPanResponderRelease: () => {
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            setBannerIdx((i) => (i + 1) % BANNERS.length);
          } else {
            setBannerIdx((i) => (i - 1 + BANNERS.length) % BANNERS.length);
          }
        }
      },
    })
  ).current;

  if (!width || width <= 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.carousel, { width, height: BANNER_HEIGHT }]} {...panResponder.panHandlers}>
        <View
          style={[
            styles.slider,
            {
              width: width * BANNERS.length,
              transform: [{ translateX: -bannerIdx * width }],
            },
          ]}
        >
          {BANNERS.map((uri, i) => (
            <View key={i} style={[styles.slideWrap, { width, height: BANNER_HEIGHT }]}>
              <Image
                source={{ uri }}
                style={[styles.slide, { width, height: BANNER_HEIGHT }]}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
          ))}
        </View>
        <View style={styles.overlay} pointerEvents="none" />
        {BANNERS.length > 1 && (
          <View style={styles.dots} pointerEvents="none">
            {BANNERS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === bannerIdx ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
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
  slideWrap: { overflow: 'hidden' },
  slide: {},
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
export default memo(BannersSection);
