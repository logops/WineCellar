import React from 'react';
import { Wine, Beer, Glasses, GlassWater } from 'lucide-react';

interface WineGlassIconProps {
  type?: string;
  className?: string;
}

export function WineGlassIcon({ type = 'Red', className = '' }: WineGlassIconProps) {
  type = (type || 'Red').toLowerCase();
  
  // Map the wine type to an appropriate icon
  if (type === 'sparkling' || type === 'champagne') {
    return <Glasses className={className} />;
  } else if (type === 'white') {
    return <GlassWater className={className} />;
  } else if (type === 'rosé' || type === 'rose') {
    return <Wine className={className} style={{ color: '#ffb6c1' }} />;
  } else if (type === 'dessert' || type === 'fortified') {
    return <Wine className={className} style={{ color: '#a87000' }} />;
  } else {
    // Default to red
    return <Wine className={className} style={{ color: '#8b0000' }} />;
  }
}