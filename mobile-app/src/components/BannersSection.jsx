import React, { useState, useEffect, useRef, memo } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { haptics } from '../utils/haptics';

const BANNER_HEIGHT = 168;
const CAROUSEL_RADIUS = 16;
const HORIZONTAL_PADDING = 16;

// Same 3 banners as frontend. Order: Black Gold, Black Orange, Minimalist.
const BANNERS = [
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771503014/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1080_x_547_px_1_ooz3sj.png',
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771501969/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1080_x_547_px_npbht7.png',
  'https://res.cloudinary.com/dnyp5jknp/image/upload/w_1080,h_547,f_png,c_fill/v1771873663/Black_and_White_Minimalist_Casino_Night_Facebook_Cover_5839_x_3402_px_thbbms',
];

function BannersSection() {
  const [bannerIdx, setBannerIdx] = useState(0);
  const scrollRef = useRef(null);
  const { width: winWidth } = useWindowDimensions();
  const carouselWidth = Math.max(winWidth || 320, 320) - HORIZONTAL_PADDING * 2;

  const bannerIdxRef = useRef(0);
  bannerIdxRef.current = bannerIdx;
  const lastAutoScrollAt = useRef(0);

  useEffect(() => {
    if (BANNERS.length <= 1) return;
    const id = setInterval(() => {
      const next = (bannerIdxRef.current + 1) % BANNERS.length;
      lastAutoScrollAt.current = Date.now();
      setBannerIdx(next);
      scrollRef.current?.scrollTo({ x: next * carouselWidth, animated: true });
    }, 4000);
    return () => clearInterval(id);
  }, [carouselWidth]);

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / carouselWidth);
    if (index >= 0 && index < BANNERS.length && index !== bannerIdx) {
      const isFromAutoSlide = Date.now() - lastAutoScrollAt.current < 600;
      if (!isFromAutoSlide) haptics.light();
      setBannerIdx(index);
    }
  };

  if (!carouselWidth || carouselWidth <= 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.carouselOuter, { width: carouselWidth }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={[styles.carousel, { width: carouselWidth, height: BANNER_HEIGHT }]}
          contentContainerStyle={styles.scrollContent}
        >
          {BANNERS.map((uri, i) => (
            <View key={i} style={[styles.slideWrap, { width: carouselWidth, height: BANNER_HEIGHT }]}>
              <Image
                source={{ uri }}
                style={[styles.slide, { width: carouselWidth, height: BANNER_HEIGHT }]}
                contentFit="cover"
                contentPosition={i === 1 ? 'top' : 'center'}
                cachePolicy="memory-disk"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
    paddingHorizontal: HORIZONTAL_PADDING,
    alignItems: 'center',
  },
  carouselOuter: {
    position: 'relative',
    borderRadius: CAROUSEL_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  carousel: {
    overflow: 'hidden',
    borderRadius: CAROUSEL_RADIUS,
  },
  scrollContent: { flexGrow: 1 },
  slideWrap: {
    overflow: 'hidden',
    borderRadius: CAROUSEL_RADIUS,
  },
  slide: {
    borderRadius: CAROUSEL_RADIUS,
  },
});
export default memo(BannersSection);
