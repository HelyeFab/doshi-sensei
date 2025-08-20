'use client';

import { useState, useEffect } from 'react';
import { kanaData, KanaCharacter, playKanaAudio } from '@/data/kanaData';

interface KanaChartProps {
  chartType: 'hiragana' | 'katakana';
  selectedKana: Set<string>;
  onToggleKana: (kanaId: string) => void;
  showRomaji?: boolean;
}

export default function KanaChart({ 
  chartType, 
  selectedKana, 
  onToggleKana, 
  showRomaji = true 
}: KanaChartProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Group kana by rows for display
  const groupedKana = {
    vowels: kanaData.filter(k => k.row === 'vowel'),
    k: kanaData.filter(k => k.row === 'k'),
    g: kanaData.filter(k => k.row === 'g'),
    s: kanaData.filter(k => k.row === 's'),
    z: kanaData.filter(k => k.row === 'z'),
    t: kanaData.filter(k => k.row === 't'),
    d: kanaData.filter(k => k.row === 'd'),
    n: kanaData.filter(k => k.row === 'n'),
    h: kanaData.filter(k => k.row === 'h'),
    b: kanaData.filter(k => k.row === 'b'),
    p: kanaData.filter(k => k.row === 'p'),
    m: kanaData.filter(k => k.row === 'm'),
    y: kanaData.filter(k => k.row === 'y'),
    r: kanaData.filter(k => k.row === 'r'),
    w: kanaData.filter(k => k.row === 'w').filter(k => !['wi', 'we'].includes(k.id)), // Exclude archaic
    special: kanaData.filter(k => k.row === 'special'),
  };

  // Digraphs grouped
  const digraphs = {
    ky: kanaData.filter(k => k.row === 'ky'),
    gy: kanaData.filter(k => k.row === 'gy'),
    sh: kanaData.filter(k => k.row === 'sh'),
    j: kanaData.filter(k => k.row === 'j'),
    ch: kanaData.filter(k => k.row === 'ch'),
    ny: kanaData.filter(k => k.row === 'ny'),
    hy: kanaData.filter(k => k.row === 'hy'),
    by: kanaData.filter(k => k.row === 'by'),
    py: kanaData.filter(k => k.row === 'py'),
    my: kanaData.filter(k => k.row === 'my'),
    ry: kanaData.filter(k => k.row === 'ry'),
  };

  const handleKanaClick = async (kana: KanaCharacter, event: React.MouseEvent) => {
    // If clicking the selection corner
    if ((event.target as HTMLElement).classList.contains('selection-corner')) {
      onToggleKana(kana.id);
      return;
    }

    // Otherwise, play audio
    if (audioEnabled) {
      await playKanaAudio(kana.id, chartType);
    }
  };

  const renderKanaCard = (kana: KanaCharacter) => {
    const isSelected = selectedKana.has(kana.id);
    const displayKana = chartType === 'hiragana' ? kana.hiragana : kana.katakana;

    return (
      <div
        key={kana.id}
        onClick={(e) => handleKanaClick(kana, e)}
        className={`
          relative bg-card border rounded p-2 cursor-pointer transition-all
          hover:shadow-md hover:scale-105
          ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}
        `}
      >
        {/* Selection Corner */}
        <div
          className={`
            selection-corner absolute top-0 right-0 w-3 h-3 rounded-bl cursor-pointer
            transition-colors z-10
            ${isSelected ? 'bg-primary' : 'bg-primary/20 hover:bg-primary/40'}
          `}
        />

        {/* Kana Character */}
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold text-foreground">
            {displayKana}
          </div>
          {showRomaji && (
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {kana.romaji}
            </div>
          )}
          {kana.pronunciation && (
            <div className="text-[9px] text-muted-foreground/70 italic mt-0.5">
              {kana.pronunciation}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRow = (title: string, kanaList: KanaCharacter[]) => {
    if (kanaList.length === 0) return null;

    // Fill empty slots for consistent grid
    const columns = ['a', 'i', 'u', 'e', 'o'];
    const filledRow = columns.map(col => {
      const kana = kanaList.find(k => k.column === col);
      return kana || null;
    });

    return (
      <div className="mb-6">
        {title && (
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {title}
          </h3>
        )}
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {filledRow.map((kana, index) => 
            kana ? renderKanaCard(kana) : (
              <div key={`empty-${title}-${index}`} className="invisible" />
            )
          )}
        </div>
      </div>
    );
  };

  const renderDigraphRow = (title: string, kanaList: KanaCharacter[]) => {
    if (kanaList.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          {title}
        </h4>
        <div className="grid grid-cols-3 gap-1">
          {kanaList.map(kana => renderKanaCard(kana))}
          {/* Fill empty slots */}
          {kanaList.length < 3 && Array(3 - kanaList.length).fill(null).map((_, i) => (
            <div key={`empty-${title}-${i}`} className="invisible" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main Chart */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Basic Characters</h2>
        
        {/* Vowels */}
        {renderRow('Vowels', groupedKana.vowels)}
        
        {/* Consonants */}
        {renderRow('K', groupedKana.k)}
        {renderRow('G', groupedKana.g)}
        {renderRow('S', groupedKana.s)}
        {renderRow('Z', groupedKana.z)}
        {renderRow('T', groupedKana.t)}
        {renderRow('D', groupedKana.d)}
        {renderRow('N', groupedKana.n)}
        {renderRow('H', groupedKana.h)}
        {renderRow('B', groupedKana.b)}
        {renderRow('P', groupedKana.p)}
        {renderRow('M', groupedKana.m)}
        
        {/* Y and R rows (only 3 characters) */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Y
          </h3>
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {renderKanaCard(groupedKana.y[0])}
            <div className="invisible" />
            {groupedKana.y[1] && renderKanaCard(groupedKana.y[1])}
            <div className="invisible" />
            {groupedKana.y[2] && renderKanaCard(groupedKana.y[2])}
          </div>
        </div>
        
        {renderRow('R', groupedKana.r)}
        
        {/* W row and N */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            W / N
          </h3>
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {groupedKana.w[0] && renderKanaCard(groupedKana.w[0])}
            <div className="invisible" />
            <div className="invisible" />
            <div className="invisible" />
            {groupedKana.w[1] && renderKanaCard(groupedKana.w[1])}
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mt-2">
            <div className="invisible" />
            <div className="invisible" />
            {groupedKana.special[0] && renderKanaCard(groupedKana.special[0])}
            <div className="invisible" />
            <div className="invisible" />
          </div>
        </div>
      </div>

      {/* Digraphs Section */}
      <div className="border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Digraphs (Combinations)</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderDigraphRow('Kya / Kyu / Kyo', digraphs.ky)}
          {renderDigraphRow('Gya / Gyu / Gyo', digraphs.gy)}
          {renderDigraphRow('Sha / Shu / Sho', digraphs.sh)}
          {renderDigraphRow('Ja / Ju / Jo', digraphs.j)}
          {renderDigraphRow('Cha / Chu / Cho', digraphs.ch)}
          {renderDigraphRow('Nya / Nyu / Nyo', digraphs.ny)}
          {renderDigraphRow('Hya / Hyu / Hyo', digraphs.hy)}
          {renderDigraphRow('Bya / Byu / Byo', digraphs.by)}
          {renderDigraphRow('Pya / Pyu / Pyo', digraphs.py)}
          {renderDigraphRow('Mya / Myu / Myo', digraphs.my)}
          {renderDigraphRow('Rya / Ryu / Ryo', digraphs.ry)}
        </div>
      </div>
    </div>
  );
}