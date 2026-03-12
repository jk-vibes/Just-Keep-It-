import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { WealthItem } from '../types';
import { getCurrencySymbol } from '../constants';

interface AssetTreeProps {
  wealthItems: WealthItem[];
  currency: string;
  height?: number;
}

const AssetTree: React.FC<AssetTreeProps> = ({ wealthItems, currency, height = 600 }) => {
  const symbol = getCurrencySymbol(currency);
  
  const formatValueStrict = (val: number) => {
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
      .sort((a, b) => a.value - b.value);
  }, [wealthItems]);

  const totalValue = assetData.reduce((sum, d) => sum + d.value, 0);

  const nodes = useMemo(() => {
    return assetData.map((data, index) => {
      // Modern tree: alternating sides, growing upwards
      const side = index % 2 === 0 ? 1 : -1;
      const level = Math.floor(index / 2);
      // Adjust vertical spacing to fit more accounts comfortably
      const yBase = (height - 40) - level * 65; 
      // Increased horizontal spread
      const xOffset = side * (65 + (level * 8)); 
      
      const targetX = 200 + xOffset; // Centered at 200 in a 400 width view
      const targetY = yBase - 20;
      
      return {
        ...data,
        targetX,
        targetY,
        side,
        level
      };
    });
  }, [assetData, height]);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-transparent px-1">
      <svg viewBox={`-50 0 500 ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="trunkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.1" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main Trunk (Sleek Spine) */}
        <motion.path
          d={`M200,${height} L200,40`}
          stroke="url(#trunkGrad)"
          strokeWidth="2"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Branches and Labels */}
        {nodes.map((node, index) => {
          return (
            <g key={node.id}>
              {/* Branch Line */}
              <motion.path
                d={`M200,${node.targetY + 20} Q${200 + node.side * 20},${node.targetY + 20} ${node.targetX},${node.targetY}`}
                stroke="#94a3b8"
                strokeWidth="1.5"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
              />

              {/* Joint Circle */}
              <motion.circle
                cx="200" cy={node.targetY + 20} r="3"
                fill="#64748b"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              />

              {/* Bento Leaf Card */}
              <motion.g
                initial={{ opacity: 0, x: node.side * 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 1 + index * 0.1, type: "spring", stiffness: 100 }}
              >
                {/* Card Background */}
                <rect
                  x={node.side === 1 ? node.targetX : node.targetX - 90}
                  y={node.targetY - 20}
                  width="90"
                  height="40"
                  rx="12"
                  fill="white"
                  className="fill-white dark:fill-slate-800"
                  filter="url(#cardShadow)"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />

                {/* Accent Strip - Always on the inner side (closest to trunk) */}
                <rect
                  x={node.side === 1 ? node.targetX : node.targetX - 4}
                  y={node.targetY - 20}
                  width="4"
                  height="40"
                  rx="2"
                  fill={index % 2 === 0 ? "#10b981" : "#6366f1"}
                />

                {/* Text Content */}
                <text
                  x={node.side === 1 ? node.targetX + 12 : node.targetX - 78}
                  y={node.targetY - 4}
                  className="text-[9px] font-black fill-slate-500 uppercase tracking-widest"
                >
                  {node.name.length > 12 ? node.name.substring(0, 11) + '..' : node.name}
                </text>
                <text
                  x={node.side === 1 ? node.targetX + 12 : node.targetX - 78}
                  y={node.targetY + 10}
                  className="text-[12px] font-black fill-slate-900 dark:fill-white tracking-tighter"
                >
                  {symbol}{formatValueStrict(node.value)}
                </text>

                {/* Percentage Indicator */}
                <text
                  x={node.side === 1 ? node.targetX + 75 : node.targetX - 15}
                  y={node.targetY + 10}
                  textAnchor="middle"
                  className="text-[7px] font-bold fill-slate-400"
                >
                  {Math.round((node.value / (totalValue || 1)) * 100)}%
                </text>
              </motion.g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default AssetTree;
