import React from 'react';
import MarketSections from '../MarketSections';
import HomeGamesPanel from './HomeGamesPanel';
import HomeStarlinePanel from './HomeStarlinePanel';
import HomeKingBazaarPanel from './HomeKingBazaarPanel';

export default function HomePanelContent({ activePanel }) {
  switch (activePanel) {
    case 'casino':
      return <HomeGamesPanel category="highEarning" />;
    case 'skills':
      return <HomeGamesPanel category="skills" />;
    case 'markets':
      return (
        <div id="markets-section">
          <MarketSections />
        </div>
      );
    case 'kingBazaar':
      return <HomeKingBazaarPanel />;
    case 'starline':
    default:
      return <HomeStarlinePanel />;
  }
}
