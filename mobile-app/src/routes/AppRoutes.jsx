import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from '../navigationRef';
import { storage } from '../utils/storage';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useTranslation } from '../hooks/useTranslation';

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

// Match frontend: screens that do NOT show top navbar (AppHeader + SubHeader) on mobile
const HIDE_TOP_NAV_SCREENS = [
  'Bids',
  'BetHistory',
  'StarlineBetHistory',
  'KingBazaarBetHistory',
  'MarketResultHistory',
  'Funds',
  'AddFund',
  'WithdrawFund',
  'Bank',
  'AddFundHistory',
  'WithdrawFundHistory',
  'Profile',
  'Notifications',
  'BidOptions',
  'GameBid',
  'Games',
  'Support',
  'SupportNew',
  'SupportStatus',
];

// Match actual navbar height: inner ~52 + py + label ~14, center lift -16; keep minimal gap
const BOTTOM_NAV_HEIGHT = 58 + 10;

function Layout({ children }) {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  useTranslation(); // re-render layout + all screens when language changes
  const bottomPad = BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 0);
  const hideTopNav = HIDE_TOP_NAV_SCREENS.includes(route.name);

  if (route.name === 'Login') return <>{children}</>;
  return (
    <View style={styles.layout}>
      {!hideTopNav && (
        <>
          <AppHeader />
          <SubHeader />
        </>
      )}
      <View
        style={[
          styles.content,
          { paddingBottom: bottomPad, paddingTop: hideTopNav ? Math.max(4, insets.top) : 4 },
        ]}
      >
        {children}
      </View>
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

const navigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#000' },
  animation: 'fade',
  freezeOnBlur: true,
};

const tabScreenOptions = { animation: 'none' };

// Define wrapped components once outside to prevent re-mounting on every AppRoutes render
const HomeWithLayout = withLayout(Home);
const BidOptionsWithLayout = withLayout(BidOptions);
const GameBidWithLayout = withLayout(GameBid);
const PassbookWithLayout = withLayout(Passbook);
const FundsWithLayout = withLayout(Funds);
const DownloadWithLayout = withLayout(Download);
const BidsWithLayout = withLayout(Bids);
const ProfileWithLayout = withLayout(Profile);
const BetHistoryWithLayout = withLayout(BetHistory);
const StarlineBetHistoryWithLayout = withLayout(StarlineBetHistory);
const KingBazaarBetHistoryWithLayout = withLayout(KingBazaarBetHistory);
const MarketResultHistoryWithLayout = withLayout(MarketResultHistory);
const StartlineDashboardWithLayout = withLayout(StartlineDashboard);
const StarlineMarketWithLayout = withLayout(StarlineMarket);
const KingBazaarMarketWithLayout = withLayout(KingBazaarMarket);
const KingBazaarDashboardWithLayout = withLayout(KingBazaarDashboard);
const GamesWithLayout = withLayout(Games);
const NotificationsWithLayout = withLayout(Notifications);
const TopWinnersWithLayout = withLayout(TopWinners);
const GameRateWithLayout = withLayout(GameRate);
const SupportNewWithLayout = withLayout(SupportNew);
const SupportStatusWithLayout = withLayout(SupportStatus);
const SupportWithLayout = withLayout(Support);
const AddFundWithLayout = withLayout(AddFund);
const WithdrawFundWithLayout = withLayout(WithdrawFund);
const BankWithLayout = withLayout(Bank);
const AddFundHistoryWithLayout = withLayout(AddFundHistory);
const WithdrawFundHistoryWithLayout = withLayout(WithdrawFundHistory);

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

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={navigationOptions}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Home" component={HomeWithLayout} options={tabScreenOptions} />
        <Stack.Screen name="BidOptions" component={BidOptionsWithLayout} />
        <Stack.Screen name="MainMarket" component={BidOptionsWithLayout} />
        <Stack.Screen name="GameBid" component={GameBidWithLayout} />
        <Stack.Screen name="Passbook" component={PassbookWithLayout} />
        <Stack.Screen name="Funds" component={FundsWithLayout} options={tabScreenOptions} />
        <Stack.Screen name="Download" component={DownloadWithLayout} />
        <Stack.Screen name="Bids" component={BidsWithLayout} options={tabScreenOptions} />
        <Stack.Screen name="Profile" component={ProfileWithLayout} options={tabScreenOptions} />
        <Stack.Screen name="BetHistory" component={BetHistoryWithLayout} />
        <Stack.Screen name="StarlineBetHistory" component={StarlineBetHistoryWithLayout} />
        <Stack.Screen name="KingBazaarBetHistory" component={KingBazaarBetHistoryWithLayout} />
        <Stack.Screen name="MarketResultHistory" component={MarketResultHistoryWithLayout} />
        <Stack.Screen name="StartlineDashboard" component={StartlineDashboardWithLayout} />
        <Stack.Screen name="StarlineMarket" component={StarlineMarketWithLayout} />
        <Stack.Screen name="KingBazaarMarket" component={KingBazaarMarketWithLayout} />
        <Stack.Screen name="KingBazaarDashboard" component={KingBazaarDashboardWithLayout} />
        <Stack.Screen name="Games" component={GamesWithLayout} />
        <Stack.Screen name="Notifications" component={NotificationsWithLayout} />
        <Stack.Screen name="TopWinners" component={TopWinnersWithLayout} />
        <Stack.Screen name="GameRate" component={GameRateWithLayout} />
        <Stack.Screen name="SupportNew" component={SupportNewWithLayout} options={tabScreenOptions} />
        <Stack.Screen name="SupportStatus" component={SupportStatusWithLayout} options={tabScreenOptions} />
        <Stack.Screen name="Support" component={SupportWithLayout} options={tabScreenOptions} />
        <Stack.Screen name="AddFund" component={AddFundWithLayout} />
        <Stack.Screen name="WithdrawFund" component={WithdrawFundWithLayout} />
        <Stack.Screen name="Bank" component={BankWithLayout} />
        <Stack.Screen name="AddFundHistory" component={AddFundHistoryWithLayout} />
        <Stack.Screen name="WithdrawFundHistory" component={WithdrawFundHistoryWithLayout} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  layout: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, paddingTop: 4 },
});
