'use client';

import Link from 'next/link';
import { useStats } from '@/hooks/useStats';

interface ToriiGateProps {
  profile?: any;
  displayName?: string;
  greeting?: string;
  readyText?: string;
  featureCards?: any[];
  cardColors?: string[];
}

export function ToriiGate({ 
  profile, 
  displayName = 'Friend', 
  greeting = 'Hello', 
  readyText = 'Ready to practice some Japanese?',
  featureCards = [],
  cardColors = []
}: ToriiGateProps) {
  const { stats, loading } = useStats();

  return (
    <>
      {/* Welcome Header */}
      <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '2rem' }}>
        <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>
          {greeting} {displayName}-san! 👋
        </h1>
        <p style={{ color: 'white', fontSize: '1.125rem' }}>
          {readyText}
        </p>
      </div>

      {/* Torii Gate */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/practice">
          <img 
            src="/flat-icons/tori/tori.svg"
            alt="Torii Gate"
            style={{ width: '16rem', height: '16rem', margin: '0 auto' }}
          />
          <h3 style={{ fontSize: '3rem', fontWeight: 'bold', marginTop: '1.5rem' }}>
            <span style={{ 
              background: 'linear-gradient(to right, #dc2626, #ea580c, #dc2626)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Enter the Gateway
            </span>
          </h3>
          <p style={{ 
            fontSize: '2rem', 
            color: 'white', 
            fontWeight: '600',
            marginTop: '1.5rem'
          }}>
            Begin your Japanese adventure through the sacred torii
          </p>
        </Link>
      </div>

      {/* Feature Cards */}
      <div style={{ marginTop: '3rem', padding: '0 1rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {featureCards.map((card, index) => (
            <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid white',
                borderRadius: '1rem',
                padding: '1.5rem',
                textAlign: 'center',
                transition: 'transform 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {card.icon}
                </div>
                <h3 style={{ 
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  marginBottom: '0.25rem'
                }}>
                  {card.title}
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem'
                }}>
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Simple Stats Bar */}
      <div style={{ marginTop: '2rem', textAlign: 'center', paddingBottom: '2rem' }}>
        <div style={{ 
          display: 'inline-flex',
          gap: '2rem',
          color: 'white',
          fontSize: '1rem'
        }}>
          <span>🔥 {loading ? '...' : `${stats.currentStreak} days`}</span>
          <span>⚡ {loading ? '...' : stats.drillsCompleted}</span>
          <span>漢 {loading ? '...' : stats.totalKanjiLearned}</span>
          <span>🎮 {loading ? '...' : stats.pokemonCaught}</span>
        </div>
      </div>

    </>
  );
}