import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { WealthItem } from '../types';
import { getCurrencySymbol } from '../constants';

interface LineDrawingTreeProps {
  wealthItems: WealthItem[];
  currency: string;
  height?: number;
}

interface TreeBranch {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  delay: number;
  label?: {
    name: string;
    value: number;
    side: 'left' | 'right';
    x: number;
    y: number;
  };
}

const LineDrawingTree: React.FC<LineDrawingTreeProps> = ({ wealthItems, currency, height = 600 }) => {
  const symbol = getCurrencySymbol(currency);
  
  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}K`;
    return val.toString();
  };

  const assetData = useMemo(() => {
    return wealthItems
      .filter(i => i.type === 'Investment')
      .map(item => ({
        id: item.id,
        name: item.name,
        value: item.value
      }))
      .sort((a, b) => a.value - b.value); // Smaller first (bottom)
  }, [wealthItems]);

  const treeStructure = useMemo(() => {
    const branches: any[] = [];
    const centerX = 200;
    const baseY = height - 10;
    
    // Seeded random for deterministic organic look
    let seed = 123;
    const seededRandom = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // 1. Tapered Trunk
    const trunkTopY = baseY - height * 0.8;
    branches.push({
      type: 'trunk',
      id: 'main-trunk',
      d: `M ${centerX - 15} ${baseY} 
          Q ${centerX} ${baseY - 30} ${centerX - 5} ${trunkTopY}
          L ${centerX + 5} ${trunkTopY}
          Q ${centerX} ${baseY - 30} ${centerX + 15} ${baseY}`,
      thickness: 0,
      fill: true,
      delay: 0
    });

    // 2. Divide items into 3 groups (Bottom, Middle, Top)
    const n = assetData.length;
    const bottomCount = Math.floor(n * 0.25);
    const middleCount = Math.floor(n * 0.35);
    const topCount = n - bottomCount - middleCount;

    const bottomItems = assetData.slice(0, bottomCount);
    const middleItems = assetData.slice(bottomCount, bottomCount + middleCount);
    const topItems = assetData.slice(bottomCount + middleCount);

    // Helper to draw a tier of branches
    const drawTier = (
      items: typeof assetData, 
      tierY: number, 
      numMainBranches: number, 
      baseLen: number, 
      spreadFactor: number, 
      delayBase: number
    ) => {
      if (items.length === 0) return;
      
      const itemsPerBranch = Math.ceil(items.length / numMainBranches);
      
      for (let i = 0; i < numMainBranches; i++) {
        const branchItems = items.slice(i * itemsPerBranch, (i + 1) * itemsPerBranch);
        if (branchItems.length === 0) continue;

        // Main branch for this group
        const angleOffset = (i - (numMainBranches - 1) / 2) * spreadFactor;
        const mainAngle = -Math.PI / 2 + angleOffset;
        const mainLen = baseLen * 0.4;
        const mainEndX = centerX + Math.cos(mainAngle) * mainLen;
        const mainEndY = tierY + Math.sin(mainAngle) * mainLen;

        branches.push({
          type: 'branch',
          id: `tier-${tierY}-main-${i}`,
          d: `M ${centerX} ${tierY} Q ${centerX + Math.cos(mainAngle) * (mainLen * 0.5)} ${tierY + Math.sin(mainAngle) * (mainLen * 0.5)} ${mainEndX} ${mainEndY}`,
          thickness: Math.max(1.5, 3 - (tierY / height) * 2),
          delay: delayBase + i * 0.1
        });

        // Sub-branches for items in this group
        branchItems.forEach((item, idx) => {
          const subAngleOffset = (idx - (branchItems.length - 1) / 2) * 0.4;
          const subAngle = mainAngle + subAngleOffset + (seededRandom() * 0.2 - 0.1);
          const subLen = baseLen * 0.6 * (0.8 + seededRandom() * 0.4);
          const endX = mainEndX + Math.cos(subAngle) * subLen;
          const endY = mainEndY + Math.sin(subAngle) * subLen;

          const cpX = mainEndX + Math.cos(subAngle) * (subLen * 0.5);
          const cpY = mainEndY + Math.sin(subAngle) * (subLen * 0.5);

          branches.push({
            type: 'branch',
            id: item.id,
            d: `M ${mainEndX} ${mainEndY} Q ${cpX} ${cpY} ${endX} ${endY}`,
            thickness: 1.2,
            delay: delayBase + 0.2 + idx * 0.1,
            label: {
              name: item.name,
              value: item.value,
              side: endX > centerX ? 'right' : 'left',
              x: endX,
              y: endY
            }
          });
        });
      }
    };

    // Bottom Tier: 2 branches, lower height, smaller spread, shorter length
    drawTier(bottomItems, baseY - height * 0.25, 2, height * 0.15, 0.6, 0.5);

    // Middle Tier: 3 branches, middle height, medium spread, medium length
    drawTier(middleItems, baseY - height * 0.5, 3, height * 0.2, 0.9, 1.0);

    // Top Tier: 4 branches, top height, wider spread, longer length
    drawTier(topItems, baseY - height * 0.75, 4, height * 0.25, 1.2, 1.5);

    return branches;
  }, [assetData, height]);

  function lengthByHeight(h: number) {
    // Heuristic for branch length based on total height
    return Math.max(70, h * 0.18);
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-transparent px-1">
      <svg viewBox={`-15 0 430 ${height}`} className="w-full h-full">
        {treeStructure.map((branch) => (
          <g key={branch.id}>
            {branch.type === 'trunk' ? (
              <motion.path
                d={branch.d}
                className="fill-slate-400/40 dark:fill-slate-700/40"
                initial={{ opacity: 0, scaleY: 0, originY: 1 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            ) : (
              <motion.path
                d={branch.d}
                fill="none"
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                strokeWidth={branch.thickness}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ 
                  delay: branch.delay, 
                  duration: 0.8, 
                  ease: "easeOut" 
                }}
              />
            )}
            
            {branch.label && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: branch.delay + 0.6, type: "spring", stiffness: 200 }}
              >
                {/* Small node at the tip */}
                <circle 
                  cx={branch.label.x} 
                  cy={branch.label.y} 
                  r="2.5" 
                  className="fill-emerald-500" 
                />
                
                {/* Label Text */}
                <g transform={`translate(${branch.label.x + (branch.label.side === 'right' ? 8 : -8)}, ${branch.label.y})`}>
                  <text
                    textAnchor={branch.label.side === 'right' ? 'start' : 'end'}
                    className="text-[7px] font-black fill-slate-500 dark:fill-slate-400 uppercase tracking-tighter"
                    dominantBaseline="middle"
                    y="-4"
                  >
                    {branch.label.name}
                  </text>
                  <text
                    textAnchor={branch.label.side === 'right' ? 'start' : 'end'}
                    className="text-[9px] font-black fill-slate-900 dark:fill-white tracking-tighter"
                    dominantBaseline="middle"
                    y="5"
                  >
                    {symbol}{formatValue(branch.label.value)}
                  </text>
                </g>
              </motion.g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default LineDrawingTree;
