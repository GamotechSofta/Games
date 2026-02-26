import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from '../navigationRef';
import { storage } from '../utils/storage';
import { useHeartbeat } from '../hooks/useHeartbeat';

import AppHeader from '../components/AppHeader';
import SubHeader from '../components/SubHeader';
import BottomNavbar from '../components/BottomNavbar';

import Home from '../pages/Home';
import Login from '../pages/Login';
import BidOptions from '../pages/BidOptions';
import GameBid from '../pages/GameBid';
import Passbook from '../pages/Passbook';
import Funds from '../pages/Funds';
import Download from '../pages/Download';
import Bids from '../pages/Bids';
import Profile from '../pages/Profile';
import BetHistory from '../pages/BetHistory';
import StarlineBetHistory from '../pages/StarlineBetHistory';
import KingBazaarBetHistory from '../pages/KingBazaarBetHistory';
import MarketResultHistory from '../pages/MarketResultHistory';
import StartlineDashboard from '../pages/StartlineDashboard';
import StarlineMarket from '../pages/StarlineMarket';
import KingBazaarMarket from '../pages/KingBazaarMarket';
import KingBazaarDashboard from '../pages/KingBazaarDashboard';
import Games from '../pages/Games';
import Notifications from '../pages/Notifications';
import TopWinners from '../pages/TopWinners';
import GameRate from '../pages/GameRate';
import SupportNew from '../pages/Support/SupportNew';
import SupportStatus from '../pages/Support/SupportStatus';
import AddFund from '../pages/funds/AddFund';
import WithdrawFund from '../pages/funds/WithdrawFund';
import Bank from '../pages/funds/Bank';
import AddFundHistory from '../pages/funds/AddFundHistory';
import WithdrawFundHistory from '../pages/funds/WithdrawFundHistory';
import Support from '../pages/Support/Support';

const Stack = createNativeStackNavigator();
const PUBLIC_SCREENS = ['Login'];

// Match actual navbar height: inner ~52 + py + label ~14, center lift -16; keep minimal gap
const BOTTOM_NAV_HEIGHT = 58 + 10;

function Layout({ children }) {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const bottomPad = BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 0);

  if (route.name === 'Login') return <>{children}</>;
  return (
    <View style={styles.layout}>
      <AppHeader />
      <SubHeader />
      <View style={[styles.content, { paddingBottom: bottomPad }]}>{children}</View>
      <BottomNavbar />
    </View>
  );
}

const withLayout = (Component) => {
  return function Wrapped(props) {
    return (
      <Layout>
        <Component {...props} />
      </Layout>
    );
  };
};

export default function AppRoutes() {
  const [initialRoute, setInitialRoute] = useState(null);

  useHeartbeat();

  useEffect(() => {
    storage.getItem('user').then((s) => {
      setInitialRoute(s ? 'Home' : 'Login');
    });
  }, []);

  if (initialRoute === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f3b61b" />
      </View>
    );
  }

  const tabScreenOptions = { animation: 'none' };
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
          animation: 'default',
          freezeOnBlur: true,
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Home" component={withLayout(Home)} options={tabScreenOptions} />
        <Stack.Screen name="BidOptions" component={withLayout(BidOptions)} />
        <Stack.Screen name="MainMarket" component={withLayout(BidOptions)} />
        <Stack.Screen name="GameBid" component={withLayout(GameBid)} />
        <Stack.Screen name="Passbook" component={withLayout(Passbook)} />
        <Stack.Screen name="Funds" component={withLayout(Funds)} options={tabScreenOptions} />
        <Stack.Screen name="Download" component={withLayout(Download)} />
        <Stack.Screen name="Bids" component={withLayout(Bids)} options={tabScreenOptions} />
        <Stack.Screen name="Profile" component={withLayout(Profile)} options={tabScreenOptions} />
        <Stack.Screen name="BetHistory" component={withLayout(BetHistory)} />
        <Stack.Screen name="StarlineBetHistory" component={withLayout(StarlineBetHistory)} />
        <Stack.Screen name="KingBazaarBetHistory" component={withLayout(KingBazaarBetHistory)} />
        <Stack.Screen name="MarketResultHistory" component={withLayout(MarketResultHistory)} />
        <Stack.Screen name="StartlineDashboard" component={withLayout(StartlineDashboard)} />
        <Stack.Screen name="StarlineMarket" component={withLayout(StarlineMarket)} />
        <Stack.Screen name="KingBazaarMarket" component={withLayout(KingBazaarMarket)} />
        <Stack.Screen name="KingBazaarDashboard" component={withLayout(KingBazaarDashboard)} />
        <Stack.Screen name="Games" component={withLayout(Games)} />
        <Stack.Screen name="Notifications" component={withLayout(Notifications)} />
        <Stack.Screen name="TopWinners" component={withLayout(TopWinners)} />
        <Stack.Screen name="GameRate" component={withLayout(GameRate)} />
        <Stack.Screen name="SupportNew" component={withLayout(SupportNew)} />
        <Stack.Screen name="SupportStatus" component={withLayout(SupportStatus)} />
        <Stack.Screen name="Support" component={withLayout(Support)} options={tabScreenOptions} />
        <Stack.Screen name="AddFund" component={withLayout(AddFund)} />
        <Stack.Screen name="WithdrawFund" component={withLayout(WithdrawFund)} />
        <Stack.Screen name="Bank" component={withLayout(Bank)} />
        <Stack.Screen name="AddFundHistory" component={withLayout(AddFundHistory)} />
        <Stack.Screen name="WithdrawFundHistory" component={withLayout(WithdrawFundHistory)} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  layout: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, paddingTop: 4 },
});
